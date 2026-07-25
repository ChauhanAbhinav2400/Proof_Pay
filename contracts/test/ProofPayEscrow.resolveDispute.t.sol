// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowResolveDisputeTest is Test {
    event DisputeResolved(
        uint256 indexed escrowId,
        address indexed arbitrator,
        uint256 freelancerAward,
        uint256 clientRefund
    );

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

    uint256 internal constant CLIENT_BALANCE = 20_000e6;
    uint256 internal constant ESCROWS_SLOT = 3;

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
    address internal randomUser;

    uint256 internal escrowId;
    uint256 internal totalAmount;

    function setUp() public {
        arbitratorPrivateKey = 0xA4817A70;
        freelancerPrivateKey = 0xA11CE;
        wrongSignerPrivateKey = 0xB0B;

        admin = makeAddr("admin");
        arbitrator = vm.addr(arbitratorPrivateKey);
        client = makeAddr("client");
        freelancer = vm.addr(freelancerPrivateKey);
        relayer = makeAddr("relayer");
        randomUser = makeAddr("randomUser");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, CLIENT_BALANCE);

        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        totalAmount = _totalAmount(milestoneAmounts);
        escrowId = _createDisputedEscrow(milestoneAmounts);
    }

    function test_ResolveDispute_Success() public {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DisputeResolved(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund
        );
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Completed)
        );
        assertEq(
            mockUSDT.balanceOf(freelancer),
            freelancerBalanceBefore + freelancerAward
        );
        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore + clientRefund);
    }

    function test_ResolveDispute_ExactFundAccounting() public {
        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);

        _resolveDispute(escrowId, 30e6, 70e6);

        assertEq(mockUSDT.balanceOf(freelancer), freelancerBalanceBefore + 30e6);
        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore + 70e6);
        assertEq(mockUSDT.balanceOf(address(escrow)), 0);
    }

    function test_ResolveDispute_RevertsWithWrongSigner() public {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            wrongSignerPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
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
    }

    function test_ResolveDispute_RevertsWithWrongNonce() public {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator) + 1,
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
    }

    function test_ResolveDispute_RevertsOnReplayAttack() public {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
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

    function test_ResolveDispute_RevertsWhenSignatureDeadlineExpired() public {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
        uint256 deadline = block.timestamp;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );
    }

    function test_ResolveDispute_RevertsWhenEscrowNotFound() public {
        uint256 missingEscrowId = 999;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            missingEscrowId,
            30e6,
            70e6,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.EscrowNotFound.selector);
        escrow.resolveDispute(
            missingEscrowId,
            arbitrator,
            30e6,
            70e6,
            deadline,
            signature
        );
    }

    function test_ResolveDispute_RevertsWhenPendingAcceptance() public {
        uint256 pendingEscrowId = _createPendingEscrow(_defaultMilestoneAmounts());

        _expectResolveRevertWithInvalidState(pendingEscrowId);
    }

    function test_ResolveDispute_RevertsWhenActive() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Active);

        _expectResolveRevertWithInvalidState(escrowId);
    }

    function test_ResolveDispute_RevertsWhenCompleted() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Completed);

        _expectResolveRevertWithInvalidState(escrowId);
    }

    function test_ResolveDispute_RevertsWhenCancelled() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Cancelled);

        _expectResolveRevertWithInvalidState(escrowId);
    }

    function test_ResolveDispute_RevertsWhenDistributionIsInvalid() public {
        _expectResolveRevertWithInvalidDistribution(30e6, 20e6);
    }

    function test_ResolveDispute_RevertsWhenAwardExceedsRemainingBalance()
        public
    {
        _expectResolveRevertWithInvalidDistribution(totalAmount + 1, 0);
    }

    function test_ResolveDispute_RevertsWhenRefundExceedsRemainingBalance()
        public
    {
        _expectResolveRevertWithInvalidDistribution(0, totalAmount + 1);
    }

    function test_ResolveDispute_IncrementsArbitratorNonceAfterSuccess()
        public
    {
        assertEq(escrow.nonces(arbitrator), 0);

        _resolveDispute(escrowId, 30e6, totalAmount - 30e6);

        assertEq(escrow.nonces(arbitrator), 1);
    }

    function test_ResolveDispute_DoesNotIncrementNonceAfterFailedSignature()
        public
    {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            wrongSignerPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
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

        assertEq(escrow.nonces(arbitrator), 0);
    }

    function test_ResolveDispute_EmitsDisputeResolvedEvent() public {
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
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
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DisputeResolved(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund
        );
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );
    }

    function test_ResolveDispute_RandomRelayerCanSubmitValidArbitratorSignature()
        public
    {
        address randomRelayer = makeAddr("randomRelayer");
        uint256 freelancerAward = 30e6;
        uint256 clientRefund = totalAmount - freelancerAward;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            escrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(randomRelayer);
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Completed)
        );
    }

    function _resolveDispute(
        uint256 targetEscrowId,
        uint256 freelancerAward,
        uint256 clientRefund
    ) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            targetEscrowId,
            freelancerAward,
            clientRefund,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        escrow.resolveDispute(
            targetEscrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );
    }

    function _expectResolveRevertWithInvalidState(
        uint256 targetEscrowId
    ) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signResolveDispute(
            arbitratorPrivateKey,
            targetEscrowId,
            30e6,
            totalAmount - 30e6,
            escrow.nonces(arbitrator),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.resolveDispute(
            targetEscrowId,
            arbitrator,
            30e6,
            totalAmount - 30e6,
            deadline,
            signature
        );
    }

    function _expectResolveRevertWithInvalidDistribution(
        uint256 freelancerAward,
        uint256 clientRefund
    ) internal {
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
        vm.expectRevert(ProofPayEscrow.InvalidAmountDistribution.selector);
        escrow.resolveDispute(
            escrowId,
            arbitrator,
            freelancerAward,
            clientRefund,
            deadline,
            signature
        );
    }

    function _createDisputedEscrow(
        uint256[] memory milestoneAmounts
    ) internal returns (uint256 newEscrowId) {
        newEscrowId = _createPendingEscrow(milestoneAmounts);
        _acceptEscrow(newEscrowId);

        vm.prank(client);
        escrow.raiseDispute(newEscrowId);
    }

    function _createPendingEscrow(
        uint256[] memory milestoneAmounts
    ) internal returns (uint256 newEscrowId) {
        uint256 escrowAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), escrowAmount);
        newEscrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
    }

    function _acceptEscrow(uint256 targetEscrowId) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            targetEscrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(targetEscrowId, deadline, signature);
    }

    function _signAcceptEscrow(
        uint256 privateKey,
        uint256 targetEscrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(ACCEPT_ESCROW_TYPEHASH, targetEscrowId, nonce, deadline)
        );

        return _signTypedData(privateKey, structHash);
    }

    function _signResolveDispute(
        uint256 privateKey,
        uint256 targetEscrowId,
        uint256 freelancerAward,
        uint256 clientRefund,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                RESOLVE_DISPUTE_TYPEHASH,
                targetEscrowId,
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
        uint256 targetEscrowId
    ) internal view returns (ProofPayEscrow.EscrowState) {
        (, , , , , , ProofPayEscrow.EscrowState state) = escrow.escrows(
            targetEscrowId
        );

        return state;
    }

    function _setEscrowState(
        uint256 targetEscrowId,
        ProofPayEscrow.EscrowState state
    ) internal {
        bytes32 slot = bytes32(_packedEscrowMetadataSlot(targetEscrowId));
        uint256 packed = uint256(vm.load(address(escrow), slot));
        uint256 cleared = packed & ~(uint256(0xff) << 72);
        uint256 updated = cleared | (uint256(uint8(state)) << 72);

        vm.store(address(escrow), slot, bytes32(updated));
    }

    function _packedEscrowMetadataSlot(
        uint256 targetEscrowId
    ) internal pure returns (uint256) {
        uint256 escrowSlot = uint256(
            keccak256(abi.encode(targetEscrowId, ESCROWS_SLOT))
        );

        return escrowSlot + 5;
    }

    function _defaultMilestoneAmounts()
        internal
        pure
        returns (uint256[] memory milestoneAmounts)
    {
        milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = 100e6;
    }

    function _totalAmount(
        uint256[] memory milestoneAmounts
    ) internal pure returns (uint256 amount) {
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            amount += milestoneAmounts[i];
        }
    }
}
