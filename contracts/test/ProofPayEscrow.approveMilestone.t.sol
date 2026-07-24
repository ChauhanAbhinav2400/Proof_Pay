// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowApproveMilestoneTest is Test {
    event MilestoneApproved(
        uint256 indexed escrowId,
        uint8 indexed milestoneIndex,
        uint256 amount
    );

    bytes32 internal constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant APPROVE_MILESTONE_TYPEHASH =
        keccak256(
            "ApproveMilestone(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    uint256 internal constant CLIENT_BALANCE = 1_000_000e6;
    uint256 internal constant ESCROWS_SLOT = 3;

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    uint256 internal clientPrivateKey;
    uint256 internal freelancerPrivateKey;
    uint256 internal wrongSignerPrivateKey;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;
    address internal relayer;

    uint256 internal escrowId;

    function setUp() public {
        clientPrivateKey = 0xC11E17;
        freelancerPrivateKey = 0xA11CE;
        wrongSignerPrivateKey = 0xB0B;

        admin = makeAddr("admin");
        arbitrator = makeAddr("arbitrator");
        client = vm.addr(clientPrivateKey);
        freelancer = vm.addr(freelancerPrivateKey);
        relayer = makeAddr("relayer");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, CLIENT_BALANCE);

        escrowId = _createAcceptedEscrow(_defaultMilestoneAmounts());
    }

    function test_ApproveMilestone_Success() public {
        uint256 amount = 1_000e6;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit MilestoneApproved(escrowId, 0, amount);
        escrow.approveMilestone(escrowId, deadline, signature);

        assertEq(mockUSDT.balanceOf(freelancer), freelancerBalanceBefore + amount);
        assertEq(_currentMilestone(escrowId), 1);
    }

    function test_ApproveMilestone_CompletesFinalMilestone() public {
        _approveCurrentMilestone(escrowId);
        _approveCurrentMilestone(escrowId);
        _approveCurrentMilestone(escrowId);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Completed)
        );
    }

    function test_ApproveMilestone_RevertsWithWrongSigner() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            wrongSignerPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function test_ApproveMilestone_RevertsWithWrongNonce() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client) + 1,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function test_ApproveMilestone_RevertsOnReplayAttack() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        escrow.approveMilestone(escrowId, deadline, signature);

        vm.prank(relayer);
        vm.expectRevert();
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function test_ApproveMilestone_RevertsWhenSignatureDeadlineExpired()
        public
    {
        uint256 deadline = block.timestamp;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function test_ApproveMilestone_RevertsWhenEscrowNotFound() public {
        uint256 missingEscrowId = 999;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            missingEscrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.EscrowNotFound.selector);
        escrow.approveMilestone(missingEscrowId, deadline, signature);
    }

    function test_ApproveMilestone_RevertsWhenEscrowIsPendingAcceptance()
        public
    {
        uint256 pendingEscrowId = _createPendingEscrow(_defaultMilestoneAmounts());

        _expectApproveRevertWithInvalidState(pendingEscrowId);
    }

    function test_ApproveMilestone_RevertsWhenEscrowIsDisputed() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Disputed);

        _expectApproveRevertWithInvalidState(escrowId);
    }

    function test_ApproveMilestone_RevertsWhenEscrowIsCompleted() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Completed);

        _expectApproveRevertWithInvalidState(escrowId);
    }

    function test_ApproveMilestone_RevertsWhenEscrowIsCancelled() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Cancelled);

        _expectApproveRevertWithInvalidState(escrowId);
    }

    function test_ApproveMilestone_RevertsAfterAllMilestonesCompleted()
        public
    {
        _approveCurrentMilestone(escrowId);
        _approveCurrentMilestone(escrowId);
        _approveCurrentMilestone(escrowId);

        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert();
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function test_ApproveMilestone_IncreasesFreelancerBalanceByExactAmount()
        public
    {
        uint256 amount = 1_000e6;
        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);

        _approveCurrentMilestone(escrowId);

        assertEq(mockUSDT.balanceOf(freelancer), freelancerBalanceBefore + amount);
    }

    function test_ApproveMilestone_DecreasesContractBalanceByExactAmount()
        public
    {
        uint256 amount = 1_000e6;
        uint256 contractBalanceBefore = mockUSDT.balanceOf(address(escrow));

        _approveCurrentMilestone(escrowId);

        assertEq(mockUSDT.balanceOf(address(escrow)), contractBalanceBefore - amount);
    }

    function test_ApproveMilestone_ReleasesMilestoneAmountsInCorrectOrder()
        public
    {
        uint256[] memory milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = 20e6;
        milestoneAmounts[1] = 30e6;
        milestoneAmounts[2] = 50e6;

        uint256 orderedEscrowId = _createAcceptedEscrow(milestoneAmounts);

        uint256 balanceBefore = mockUSDT.balanceOf(freelancer);
        _approveCurrentMilestone(orderedEscrowId);
        assertEq(mockUSDT.balanceOf(freelancer), balanceBefore + 20e6);

        _approveCurrentMilestone(orderedEscrowId);
        assertEq(mockUSDT.balanceOf(freelancer), balanceBefore + 50e6);

        _approveCurrentMilestone(orderedEscrowId);
        assertEq(mockUSDT.balanceOf(freelancer), balanceBefore + 100e6);
    }

    function test_ApproveMilestone_IncrementsCurrentMilestoneCorrectly()
        public
    {
        assertEq(_currentMilestone(escrowId), 0);

        _approveCurrentMilestone(escrowId);
        assertEq(_currentMilestone(escrowId), 1);

        _approveCurrentMilestone(escrowId);
        assertEq(_currentMilestone(escrowId), 2);

        _approveCurrentMilestone(escrowId);
        assertEq(_currentMilestone(escrowId), 3);
    }

    function test_ApproveMilestone_IncrementsClientNonceAfterSuccessfulApproval()
        public
    {
        assertEq(escrow.nonces(client), 0);

        _approveCurrentMilestone(escrowId);

        assertEq(escrow.nonces(client), 1);
    }

    function test_ApproveMilestone_DoesNotIncrementNonceAfterFailedSignature()
        public
    {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            wrongSignerPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.approveMilestone(escrowId, deadline, signature);

        assertEq(escrow.nonces(client), 0);
    }

    function test_ApproveMilestone_EmitsMilestoneApprovedEvent() public {
        uint256 amount = 1_000e6;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit MilestoneApproved(escrowId, 0, amount);
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function test_ApproveMilestone_RandomRelayerCanSubmitValidClientSignature()
        public
    {
        address randomRelayer = makeAddr("randomRelayer");
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(randomRelayer);
        escrow.approveMilestone(escrowId, deadline, signature);

        assertEq(_currentMilestone(escrowId), 1);
    }

    function _createAcceptedEscrow(
        uint256[] memory milestoneAmounts
    ) internal returns (uint256 newEscrowId) {
        newEscrowId = _createPendingEscrow(milestoneAmounts);
        _acceptEscrow(newEscrowId);
    }

    function _createPendingEscrow(
        uint256[] memory milestoneAmounts
    ) internal returns (uint256 newEscrowId) {
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
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

    function _approveCurrentMilestone(uint256 targetEscrowId) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            targetEscrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        escrow.approveMilestone(targetEscrowId, deadline, signature);
    }

    function _expectApproveRevertWithInvalidState(
        uint256 targetEscrowId
    ) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            targetEscrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.approveMilestone(targetEscrowId, deadline, signature);
    }

    function _signAcceptEscrow(
        uint256 privateKey,
        uint256 targetEscrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                ACCEPT_ESCROW_TYPEHASH,
                targetEscrowId,
                nonce,
                deadline
            )
        );

        return _signTypedData(privateKey, structHash);
    }

    function _signApproveMilestone(
        uint256 privateKey,
        uint256 targetEscrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                APPROVE_MILESTONE_TYPEHASH,
                targetEscrowId,
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
        (
            ,
            ,
            ,
            ,
            ,
            ,
            ProofPayEscrow.EscrowState state
        ) = escrow.escrows(targetEscrowId);

        return state;
    }

    function _currentMilestone(
        uint256 targetEscrowId
    ) internal view returns (uint8) {
        (
            ,
            ,
            ,
            ,
            ,
            uint8 currentMilestone,

        ) = escrow.escrows(targetEscrowId);

        return currentMilestone;
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
        milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = 1_000e6;
        milestoneAmounts[1] = 2_000e6;
        milestoneAmounts[2] = 3_000e6;
    }

    function _totalAmount(
        uint256[] memory milestoneAmounts
    ) internal pure returns (uint256 totalAmount) {
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            totalAmount += milestoneAmounts[i];
        }
    }
}
