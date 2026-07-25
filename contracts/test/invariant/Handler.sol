// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";

contract Handler is Test {
    bytes32 internal constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant APPROVE_MILESTONE_TYPEHASH =
        keccak256(
            "ApproveMilestone(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant RESOLVE_DISPUTE_TYPEHASH =
        keccak256(
            "ResolveDispute(uint256 escrowId,uint256 freelancerAward,uint256 clientRefund,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    uint96 internal constant MAX_MILESTONE_AMOUNT = 1_000_000e6;

    struct EscrowRecord {
        uint256 escrowId;
        uint256 initialAmount;
        uint256 paidToFreelancer;
        uint256 refundedToClient;
        uint256[] milestoneAmounts;
        bool completedSeen;
        bool cancelledSeen;
    }

    MockUSDT public immutable token;
    ProofPayEscrow public immutable escrow;

    uint256 internal immutable clientPrivateKey;
    uint256 internal immutable freelancerPrivateKey;
    uint256 internal immutable arbitratorPrivateKey;

    address public immutable client;
    address public immutable freelancer;
    address public immutable arbitrator;
    address public immutable relayer;

    EscrowRecord[] internal records;
    address[] internal signerList;
    mapping(address => uint256) internal lastObservedNonce;

    bool internal nonceDecreased;

    constructor(MockUSDT token_, ProofPayEscrow escrow_) {
        token = token_;
        escrow = escrow_;

        clientPrivateKey = 0xC11E17;
        freelancerPrivateKey = 0xA11CE;
        arbitratorPrivateKey = 0xA4817A70;

        client = vm.addr(clientPrivateKey);
        freelancer = vm.addr(freelancerPrivateKey);
        arbitrator = vm.addr(arbitratorPrivateKey);
        relayer = makeAddr("relayer");

        signerList.push(client);
        signerList.push(freelancer);
        signerList.push(arbitrator);

        _observeNonces();
    }

    function createEscrow(
        uint8 rawMilestoneCount,
        uint96 a,
        uint96 b,
        uint96 c,
        uint96 d,
        uint96 e,
        uint256 rawDeadline
    ) external {
        _observeNonces();

        uint256[] memory milestoneAmounts = _boundedMilestones(
            rawMilestoneCount,
            a,
            b,
            c,
            d,
            e
        );
        uint256 totalAmount = _totalAmount(milestoneAmounts);
        uint64 acceptanceDeadline = uint64(
            bound(rawDeadline, block.timestamp + 1, block.timestamp + 30 days)
        );

        token.mint(client, totalAmount);

        vm.startPrank(client);
        token.approve(address(escrow), totalAmount);
        uint256 escrowId = escrow.createEscrow(
            freelancer,
            address(token),
            milestoneAmounts,
            acceptanceDeadline
        );
        vm.stopPrank();

        EscrowRecord storage record = records.push();
        record.escrowId = escrowId;
        record.initialAmount = totalAmount;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            record.milestoneAmounts.push(milestoneAmounts[i]);
        }

        _observeNonces();
    }

    function acceptEscrow(uint256 escrowSeed, uint256 rawDeadline) external {
        _observeNonces();
        if (records.length == 0) return;

        uint256 index = bound(escrowSeed, 0, records.length - 1);
        EscrowRecord storage record = records[index];
        if (
            _state(record.escrowId) !=
            ProofPayEscrow.EscrowState.PendingAcceptance
        ) return;

        uint64 acceptanceDeadline = _acceptanceDeadline(record.escrowId);
        if (block.timestamp > acceptanceDeadline) return;

        uint256 deadline = bound(
            rawDeadline,
            block.timestamp + 1,
            block.timestamp + 30 days
        );
        bytes memory signature = _signAcceptEscrow(
            record.escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(record.escrowId, deadline, signature);

        _observeNonces();
    }

    function approveMilestone(
        uint256 escrowSeed,
        uint256 rawDeadline
    ) external {
        _observeNonces();
        if (records.length == 0) return;

        uint256 index = bound(escrowSeed, 0, records.length - 1);
        EscrowRecord storage record = records[index];
        if (_state(record.escrowId) != ProofPayEscrow.EscrowState.Active)
            return;

        uint8 milestoneIndex = _currentMilestone(record.escrowId);
        if (milestoneIndex >= record.milestoneAmounts.length) return;

        uint256 deadline = bound(
            rawDeadline,
            block.timestamp + 1,
            block.timestamp + 30 days
        );
        bytes memory signature = _signApproveMilestone(
            record.escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        escrow.approveMilestone(record.escrowId, deadline, signature);

        record.paidToFreelancer += record.milestoneAmounts[milestoneIndex];
        if (_state(record.escrowId) == ProofPayEscrow.EscrowState.Completed) {
            record.completedSeen = true;
        }

        _observeNonces();
    }

    function cancelEscrow(uint256 escrowSeed) external {
        _observeNonces();
        if (records.length == 0) return;

        uint256 index = bound(escrowSeed, 0, records.length - 1);
        EscrowRecord storage record = records[index];
        if (
            _state(record.escrowId) !=
            ProofPayEscrow.EscrowState.PendingAcceptance
        ) return;

        uint64 acceptanceDeadline = _acceptanceDeadline(record.escrowId);
        if (block.timestamp <= acceptanceDeadline) {
            vm.warp(uint256(acceptanceDeadline) + 1);
        }

        vm.prank(client);
        escrow.cancelEscrow(record.escrowId);

        record.refundedToClient =
            record.initialAmount -
            record.paidToFreelancer;
        record.cancelledSeen = true;

        _observeNonces();
    }

    function raiseDispute(uint256 escrowSeed, bool byFreelancer) external {
        _observeNonces();
        if (records.length == 0) return;

        uint256 index = bound(escrowSeed, 0, records.length - 1);
        EscrowRecord storage record = records[index];
        if (_state(record.escrowId) != ProofPayEscrow.EscrowState.Active)
            return;

        vm.prank(byFreelancer ? freelancer : client);
        escrow.raiseDispute(record.escrowId);

        _observeNonces();
    }

    function resolveDispute(
        uint256 escrowSeed,
        uint96 rawAward,
        uint256 rawDeadline
    ) external {
        _observeNonces();
        if (records.length == 0) return;

        uint256 index = bound(escrowSeed, 0, records.length - 1);
        EscrowRecord storage record = records[index];
        if (_state(record.escrowId) != ProofPayEscrow.EscrowState.Disputed)
            return;

        uint256 remainingBalance = remainingEscrowFunds(index);
        uint256 freelancerAward = bound(rawAward, 0, remainingBalance);
        uint256 clientRefund = remainingBalance - freelancerAward;
        uint256 deadline = bound(
            rawDeadline,
            block.timestamp + 1,
            block.timestamp + 30 days
        );
        bytes memory signature = _signResolveDispute(
            record.escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        escrow.resolveDispute(
            record.escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );

        record.paidToFreelancer += freelancerAward;
        record.refundedToClient += clientRefund;
        record.completedSeen = true;

        _observeNonces();
    }

    function escrowCount() external view returns (uint256) {
        return records.length;
    }

    function escrowIdAt(uint256 index) external view returns (uint256) {
        return records[index].escrowId;
    }

    function initialEscrowAmount(
        uint256 index
    ) external view returns (uint256) {
        return records[index].initialAmount;
    }

    function amountPaidToFreelancer(
        uint256 index
    ) external view returns (uint256) {
        return records[index].paidToFreelancer;
    }

    function amountRefundedToClient(
        uint256 index
    ) external view returns (uint256) {
        return records[index].refundedToClient;
    }

    function remainingEscrowFunds(uint256 index) public view returns (uint256) {
        EscrowRecord storage record = records[index];

        return
            record.initialAmount -
            record.paidToFreelancer -
            record.refundedToClient;
    }

    function milestoneLength(uint256 index) external view returns (uint256) {
        return records[index].milestoneAmounts.length;
    }

    function completedSeen(uint256 index) external view returns (bool) {
        return records[index].completedSeen;
    }

    function cancelledSeen(uint256 index) external view returns (bool) {
        return records[index].cancelledSeen;
    }

    function signerCount() external view returns (uint256) {
        return signerList.length;
    }

    function signerAt(uint256 index) external view returns (address) {
        return signerList[index];
    }

    function observedNonce(address signer) external view returns (uint256) {
        return lastObservedNonce[signer];
    }

    function hasNonceDecreased() external view returns (bool) {
        return nonceDecreased;
    }

    function _boundedMilestones(
        uint8 rawMilestoneCount,
        uint96 a,
        uint96 b,
        uint96 c,
        uint96 d,
        uint96 e
    ) internal returns (uint256[] memory milestoneAmounts) {
        uint256 milestoneCount = bound(rawMilestoneCount, 1, 5);
        uint96[5] memory rawAmounts = [a, b, c, d, e];

        milestoneAmounts = new uint256[](milestoneCount);
        for (uint256 i = 0; i < milestoneCount; i++) {
            vm.assume(rawAmounts[i] > 0);
            milestoneAmounts[i] = bound(rawAmounts[i], 1, MAX_MILESTONE_AMOUNT);
        }
    }

    function _observeNonces() internal {
        for (uint256 i = 0; i < signerList.length; i++) {
            address signer = signerList[i];
            uint256 currentNonce = escrow.nonces(signer);
            if (currentNonce < lastObservedNonce[signer]) {
                nonceDecreased = true;
            }
            if (currentNonce > lastObservedNonce[signer]) {
                lastObservedNonce[signer] = currentNonce;
            }
        }
    }

    function _signAcceptEscrow(
        uint256 escrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(ACCEPT_ESCROW_TYPEHASH, escrowId, nonce, deadline)
        );

        return _signTypedData(freelancerPrivateKey, structHash);
    }

    function _signApproveMilestone(
        uint256 escrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(APPROVE_MILESTONE_TYPEHASH, escrowId, nonce, deadline)
        );

        return _signTypedData(clientPrivateKey, structHash);
    }

    function _signResolveDispute(
        uint256 escrowId,
        uint256 freelancerAward,
        uint256 clientRefund,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                RESOLVE_DISPUTE_TYPEHASH,
                escrowId,
                freelancerAward,
                clientRefund,
                nonce,
                deadline
            )
        );

        return _signTypedData(arbitratorPrivateKey, structHash);
    }

    function _signTypedData(
        uint256 privateKey,
        bytes32 structHash
    ) internal view returns (bytes memory) {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        return abi.encodePacked(r, s, v);
    }

    function _domainSeparator() internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH,
                    keccak256(bytes("ProofPay")),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(escrow)
                )
            );
    }

    function _state(
        uint256 escrowId
    ) internal view returns (ProofPayEscrow.EscrowState) {
        (, , , , , , ProofPayEscrow.EscrowState state) = escrow.escrows(
            escrowId
        );

        return state;
    }

    function _acceptanceDeadline(
        uint256 escrowId
    ) internal view returns (uint64) {
        (, , , , uint64 acceptanceDeadline, , ) = escrow.escrows(escrowId);

        return acceptanceDeadline;
    }

    function _currentMilestone(uint256 escrowId) internal view returns (uint8) {
        (, , , , , uint8 currentMilestone, ) = escrow.escrows(escrowId);

        return currentMilestone;
    }

    function _totalAmount(
        uint256[] memory milestoneAmounts
    ) internal pure returns (uint256 totalAmount) {
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            totalAmount += milestoneAmounts[i];
        }
    }
}
