import { BrowserProvider, Contract, parseUnits } from "ethers";
import { useMutation } from "@tanstack/react-query";

import { environment } from "../../../constants/environment";
import { useWallet } from "../../../hooks/use-wallet";

const erc20ApprovalAbi = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
] as const;

const proofPayEscrowAbi = [
  "function createEscrow(address freelancer,address paymentToken,uint256[] milestoneAmounts,uint64 acceptanceDeadline) returns (uint256)",
  "function nonces(address account) view returns (uint256)",
  "function raiseDispute(uint256 escrowId)",
  "event EscrowCreated(uint256 indexed escrowId,address indexed client,address indexed freelancer,address paymentToken,uint256 totalAmount)"
] as const;

export interface EnsureTokenApprovalInput {
  tokenAddress: string;
  amount: string;
}

export interface EnsureTokenApprovalResult {
  allowance: string;
  approved: boolean;
  transactionHash?: string;
}

export function useEnsureTokenApproval() {
  const { walletAddress, chainId, switchNetwork } = useWallet();

  return useMutation({
    mutationFn: async (
      input: EnsureTokenApprovalInput
    ): Promise<EnsureTokenApprovalResult> => {
      if (!window.ethereum) {
        throw new Error("MetaMask is required to approve escrow funding.");
      }

      if (!walletAddress) {
        throw new Error("Wallet must be connected before approving funds.");
      }

      if (chainId !== environment.chainId) {
        await switchNetwork();
      }

      const requiredAmount = parseTokenAmount(input.amount);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(input.tokenAddress, erc20ApprovalAbi, signer);
      const allowance = (await token.allowance(
        walletAddress,
        environment.proofPayEscrowAddress
      )) as bigint;

      if (allowance >= requiredAmount) {
        return {
          allowance: allowance.toString(),
          approved: false
        };
      }

      const transaction = await token.approve(
        environment.proofPayEscrowAddress,
        requiredAmount
      );
      const receipt = await transaction.wait();

      if (!receipt) {
        throw new Error("Approval transaction was not confirmed.");
      }

      return {
        allowance: allowance.toString(),
        approved: true,
        transactionHash: transaction.hash
      };
    }
  });
}

export interface CreateEscrowOnChainInput {
  freelancer: string;
  tokenAddress: string;
  milestoneAmounts: string[];
  acceptanceDeadline: string;
}

export interface CreateEscrowOnChainResult {
  blockchainEscrowId: string;
  transactionHash: string;
}

export function useCreateEscrowOnChain() {
  const { chainId, switchNetwork } = useWallet();

  return useMutation({
    mutationFn: async (
      input: CreateEscrowOnChainInput
    ): Promise<CreateEscrowOnChainResult> => {
      if (!window.ethereum) {
        throw new Error("MetaMask is required to create the escrow.");
      }

      if (chainId !== environment.chainId) {
        await switchNetwork();
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrow = new Contract(
        environment.proofPayEscrowAddress,
        proofPayEscrowAbi,
        signer
      );
      const deadline = parseAcceptanceDeadline(input.acceptanceDeadline);
      const transaction = await escrow.createEscrow(
        input.freelancer,
        input.tokenAddress,
        input.milestoneAmounts,
        deadline
      );
      const receipt = await transaction.wait();

      if (!receipt) {
        throw new Error("Escrow creation transaction was not confirmed.");
      }

      for (const log of receipt.logs) {
        try {
          const parsedLog = escrow.interface.parseLog(log);

          if (parsedLog?.name === "EscrowCreated") {
            return {
              blockchainEscrowId: parsedLog.args.getValue("escrowId").toString(),
              transactionHash: transaction.hash
            };
          }
        } catch {
          continue;
        }
      }

      throw new Error("EscrowCreated event was not found in transaction receipt.");
    }
  });
}

export interface AcceptEscrowSignatureInput {
  blockchainEscrowId: string;
  freelancerWallet: string;
}

export interface AcceptEscrowSignatureResult {
  deadline: string;
  signature: string;
}

export interface ApproveMilestoneSignatureInput {
  blockchainEscrowId: string;
  clientWallet: string;
}

export interface ResolveDisputeSignatureInput {
  blockchainEscrowId: string;
  freelancerAward: string;
  clientRefund: string;
}

export interface ResolveDisputeSignatureResult {
  arbitrator: string;
  freelancerAward: string;
  clientRefund: string;
  deadline: string;
  signature: string;
}

export interface RaiseDisputeOnChainInput {
  blockchainEscrowId: string;
  clientWallet: string;
  freelancerWallet: string;
}

export interface RaiseDisputeOnChainResult {
  transactionHash: string;
}

export function useSignAcceptEscrow() {
  const { chainId, switchNetwork } = useWallet();

  return useMutation({
    mutationFn: async (
      input: AcceptEscrowSignatureInput
    ): Promise<AcceptEscrowSignatureResult> => {
      if (!window.ethereum) {
        throw new Error("MetaMask is required to accept the escrow.");
      }

      if (chainId !== environment.chainId) {
        await switchNetwork();
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrow = new Contract(
        environment.proofPayEscrowAddress,
        proofPayEscrowAbi,
        signer
      );
      const nonce = (await escrow.nonces(input.freelancerWallet)) as bigint;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
      const signature = await signer.signTypedData(
        {
          name: "ProofPay",
          version: "1",
          chainId: environment.chainId,
          verifyingContract: environment.proofPayEscrowAddress
        },
        {
          AcceptEscrow: [
            { name: "escrowId", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
          ]
        },
        {
          escrowId: BigInt(input.blockchainEscrowId),
          nonce,
          deadline
        }
      );

      return {
        deadline: deadline.toString(),
        signature
      };
    }
  });
}

export function useSignApproveMilestone() {
  const { chainId, switchNetwork } = useWallet();

  return useMutation({
    mutationFn: async (
      input: ApproveMilestoneSignatureInput
    ): Promise<AcceptEscrowSignatureResult> => {
      if (!window.ethereum) {
        throw new Error("MetaMask is required to approve the milestone.");
      }

      if (chainId !== environment.chainId) {
        await switchNetwork();
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      if (signerAddress.toLowerCase() !== input.clientWallet.toLowerCase()) {
        throw new Error("Connected wallet must be the escrow client.");
      }

      const escrow = new Contract(
        environment.proofPayEscrowAddress,
        proofPayEscrowAbi,
        signer
      );
      const nonce = (await escrow.nonces(input.clientWallet)) as bigint;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
      const signature = await signer.signTypedData(
        {
          name: "ProofPay",
          version: "1",
          chainId: environment.chainId,
          verifyingContract: environment.proofPayEscrowAddress
        },
        {
          ApproveMilestone: [
            { name: "escrowId", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
          ]
        },
        {
          escrowId: BigInt(input.blockchainEscrowId),
          nonce,
          deadline
        }
      );

      return {
        deadline: deadline.toString(),
        signature
      };
    }
  });
}

export function useSignResolveDispute() {
  const { chainId, switchNetwork } = useWallet();

  return useMutation({
    mutationFn: async (
      input: ResolveDisputeSignatureInput
    ): Promise<ResolveDisputeSignatureResult> => {
      if (!window.ethereum) {
        throw new Error("MetaMask is required to resolve the dispute.");
      }

      if (chainId !== environment.chainId) {
        await switchNetwork();
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const arbitrator = await signer.getAddress();
      const escrow = new Contract(
        environment.proofPayEscrowAddress,
        proofPayEscrowAbi,
        signer
      );
      const nonce = (await escrow.nonces(arbitrator)) as bigint;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
      const freelancerAward = parseMockUsdtAmount(input.freelancerAward);
      const clientRefund = parseMockUsdtAmount(input.clientRefund);
      const signature = await signer.signTypedData(
        {
          name: "ProofPay",
          version: "1",
          chainId: environment.chainId,
          verifyingContract: environment.proofPayEscrowAddress
        },
        {
          ResolveDispute: [
            { name: "escrowId", type: "uint256" },
            { name: "freelancerAward", type: "uint256" },
            { name: "clientRefund", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
          ]
        },
        {
          escrowId: BigInt(input.blockchainEscrowId),
          freelancerAward,
          clientRefund,
          nonce,
          deadline
        }
      );

      return {
        arbitrator,
        freelancerAward: freelancerAward.toString(),
        clientRefund: clientRefund.toString(),
        deadline: deadline.toString(),
        signature
      };
    }
  });
}

export function useRaiseDisputeOnChain() {
  const { chainId, switchNetwork } = useWallet();

  return useMutation({
    mutationFn: async (
      input: RaiseDisputeOnChainInput
    ): Promise<RaiseDisputeOnChainResult> => {
      if (!window.ethereum) {
        throw new Error("MetaMask is required to raise a dispute.");
      }

      if (chainId !== environment.chainId) {
        await switchNetwork();
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = (await signer.getAddress()).toLowerCase();

      if (
        signerAddress !== input.clientWallet.toLowerCase() &&
        signerAddress !== input.freelancerWallet.toLowerCase()
      ) {
        throw new Error("Connected wallet must be the escrow client or freelancer.");
      }

      const escrow = new Contract(
        environment.proofPayEscrowAddress,
        proofPayEscrowAbi,
        signer
      );
      const transaction = await escrow.raiseDispute(input.blockchainEscrowId);
      const receipt = await transaction.wait();

      if (!receipt || receipt.status === 0) {
        throw new Error("Dispute transaction was not confirmed.");
      }

      return {
        transactionHash: transaction.hash
      };
    }
  });
}

function parseTokenAmount(amount: string): bigint {
  try {
    const parsedAmount = BigInt(amount.trim());

    if (parsedAmount <= 0n) {
      throw new Error();
    }

    return parsedAmount;
  } catch {
    throw new Error("Approval amount must be a positive integer.");
  }
}

function parseMockUsdtAmount(amount: string): bigint {
  try {
    const parsedAmount = parseUnits(amount.trim(), 6);

    if (parsedAmount < 0n) {
      throw new Error();
    }

    return parsedAmount;
  } catch {
    throw new Error("USDT amount must be a valid number with up to 6 decimals.");
  }
}

function parseAcceptanceDeadline(value: string): bigint {
  if (/^\d+$/.test(value)) {
    return BigInt(value);
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error("Acceptance deadline is invalid.");
  }

  return BigInt(Math.floor(timestamp / 1000));
}
