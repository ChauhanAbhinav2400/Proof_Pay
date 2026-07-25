// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";

contract ProofPayEscrowResolveDisputeFuzzTest is Test {
    bytes32 internal constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );
    bytes32 internal constant RESOLVE_DISPUTE_TYPEHASH =
        keccak256(
            "ResolveDispute(uint256 escrowId,uint256 freelancerAward,uint256 clientRefund,uint256 nonce,uint256 deadline)"
        );
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    uint96 internal constant MAX_ESCROW_AMOUNT = 1_000_000e6;

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    uint256 internal arbitratorPrivateKey;
    uint256 internal freelancerPrivateKey;
    uint256 internal wrongSignerPrivateKey;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;
    address internal relayer;

    function setUp() public {
        arbitratorPrivateKey = 0xA4817A70;
        freelancerPrivateKey = 0xA11CE;
        wrongSignerPrivateKey = 0xB0B;

        admin = makeAddr("admin");
        arbitrator = vm.addr(arbitratorPrivateKey);
        client = makeAddr("client");
        freelancer = vm.addr(freelancerPrivateKey);
        relayer = makeAddr("relayer");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, uint256(MAX_ESCROW_AMOUNT));
    }

    function testFuzz_ResolveDispute_RandomAwardExactAccounting(
        uint96 amount,
        uint96 rawAward
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint256 escrowId = _createDisputedEscrow(amount);
        uint256 freelancerAward = bound(rawAward, 0, amount);
        uint256 clientRefund = uint256(amount) - freelancerAward;
        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);

        _resolveDispute(escrowId, freelancerAward, clientRefund, block.timestamp + 1 days);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Completed)
        );
        assertEq(
            mockUSDT.balanceOf(freelancer),
            freelancerBalanceBefore + freelancerAward
        );
        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore + clientRefund);
        assertEq(mockUSDT.balanceOf(address(escrow)), 0);
    }

    function testFuzz_ResolveDispute_RandomRefundExactAccounting(
        uint96 amount,
        uint96 rawRefund
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint256 escrowId = _createDisputedEscrow(amount);
        uint256 clientRefund = bound(rawRefund, 0, amount);
        uint256 freelancerAward = uint256(amount) - clientRefund;

        _resolveDispute(escrowId, freelancerAward, clientRefund, block.timestamp + 1 days);

        assertEq(mockUSDT.balanceOf(freelancer), freelancerAward);
        assertEq(mockUSDT.balanceOf(address(escrow)), 0);
    }

    function testFuzz_ResolveDispute_RandomSignatureDeadline(
        uint96 amount,
        uint96 rawAward,
        uint256 rawDeadline
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint256 escrowId = _createDisputedEscrow(amount);
        uint256 freelancerAward = bound(rawAward, 0, amount);
        uint256 clientRefund = uint256(amount) - freelancerAward;
        uint256 deadline = bound(
            rawDeadline,
            block.timestamp + 1,
            block.timestamp + 365 days
        );

        _resolveDispute(escrowId, freelancerAward, clientRefund, deadline);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Completed)
        );
    }

    function testFuzz_ResolveDispute_ReplayProtection(
        uint96 amount,
        uint96 rawAward
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint256 escrowId = _createDisputedEscrow(amount);
        uint256 freelancerAward = bound(rawAward, 0, amount);
        uint256 clientRefund = uint256(amount) - freelancerAward;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );

        vm.prank(relayer);
        vm.expectRevert();
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );
    }

    function testFuzz_ResolveDispute_NonceIncrement(uint96 amount) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint256 escrowId = _createDisputedEscrow(amount);
        uint256 nonceBefore = escrow.nonces(arbitrator);

        _resolveDispute(escrowId, amount / 2, uint256(amount) - (amount / 2), block.timestamp + 1 days);

        assertEq(escrow.nonces(arbitrator), nonceBefore + 1);
    }

    function testFuzz_ResolveDispute_InvalidSignatureNonceUnchanged(
        uint96 amount,
        uint96 rawAward
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint256 escrowId = _createDisputedEscrow(amount);
        uint256 freelancerAward = bound(rawAward, 0, amount);
        uint256 clientRefund = uint256(amount) - freelancerAward;
        uint256 nonceBefore = escrow.nonces(arbitrator);
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            wrongSignerPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            nonceBefore,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );

        assertEq(escrow.nonces(arbitrator), nonceBefore);
    }

    function _createDisputedEscrow(uint96 amount) internal returns (uint256 escrowId) {
        escrowId = _createPendingEscrow(amount);
        _acceptEscrow(escrowId);

        vm.prank(client);
        escrow.raiseDispute(escrowId);
    }

    function _createPendingEscrow(uint96 amount) internal returns (uint256 escrowId) {
        uint256[] memory milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = uint256(amount);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), uint256(amount));
        escrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
    }

    function _acceptEscrow(uint256 escrowId) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function _resolveDispute(
        uint256 escrowId,
        uint256 freelancerAward,
        uint256 clientRefund,
        uint256 deadline
    ) internal {
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );
    }

    function _signAcceptEscrow(
        uint256 privateKey,
        uint256 escrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(ACCEPT_ESCROW_TYPEHASH, escrowId, nonce, deadline)
        );

        return _signTypedData(privateKey, structHash);
    }

    function _signResolveDispute(
        uint256 privateKey,
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

        return _signTypedData(privateKey, structHash);
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

    function _escrowState(
        uint256 escrowId
    ) internal view returns (ProofPayEscrow.EscrowState) {
        (, , , , , , ProofPayEscrow.EscrowState state) = escrow.escrows(
            escrowId
        );

        return state;
    }
}
