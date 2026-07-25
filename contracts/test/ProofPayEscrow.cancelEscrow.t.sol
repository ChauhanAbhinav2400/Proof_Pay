// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowCancelEscrowTest is Test {
    event EscrowCancelled(
        uint256 indexed escrowId,
        address indexed cancelledBy
    );

    uint256 internal constant CLIENT_BALANCE = 20_000e6;
    uint256 internal constant ESCROWS_SLOT = 3;

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;
    address internal randomUser;

    uint256 internal escrowId;
    uint256 internal totalAmount;
    uint64 internal acceptanceDeadline;

    function setUp() public {
        admin = makeAddr("admin");
        arbitrator = makeAddr("arbitrator");
        client = makeAddr("client");
        freelancer = makeAddr("freelancer");
        randomUser = makeAddr("randomUser");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, CLIENT_BALANCE);

        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        totalAmount = _totalAmount(milestoneAmounts);
        acceptanceDeadline = uint64(block.timestamp + 7 days);
        escrowId = _createEscrow(milestoneAmounts, acceptanceDeadline);
    }

    function test_CancelEscrow_Success() public {
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowCancelled(escrowId, client);
        escrow.cancelEscrow(escrowId);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Cancelled)
        );
        assertEq(mockUSDT.balanceOf(client), CLIENT_BALANCE);
        assertEq(mockUSDT.balanceOf(address(escrow)), 0);
    }

    function test_CancelEscrow_RevertsWhenFreelancerCancels() public {
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(freelancer);
        vm.expectRevert(ProofPayEscrow.Unauthorized.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_RevertsWhenRandomAddressCancels() public {
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(randomUser);
        vm.expectRevert(ProofPayEscrow.Unauthorized.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_RevertsBeforeAcceptanceDeadlineExpires()
        public
    {
        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_SucceedsAfterAcceptanceDeadlineExpires()
        public
    {
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        escrow.cancelEscrow(escrowId);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Cancelled)
        );
    }

    function test_CancelEscrow_RevertsWhenEscrowNotFound() public {
        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.EscrowNotFound.selector);
        escrow.cancelEscrow(999);
    }

    function test_CancelEscrow_RevertsAfterEscrowAccepted() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Active);
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_RevertsWhenEscrowCompleted() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Completed);
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_RevertsWhenEscrowDisputed() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Disputed);
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_RevertsWhenEscrowAlreadyCancelled() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Cancelled);
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.cancelEscrow(escrowId);
    }

    function test_CancelEscrow_RefundsExactEscrowedAmount() public {
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);

        vm.warp(uint256(acceptanceDeadline) + 1);
        vm.prank(client);
        escrow.cancelEscrow(escrowId);

        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore + totalAmount);
    }

    function test_CancelEscrow_DecreasesContractBalanceByRefundedAmount()
        public
    {
        uint256 contractBalanceBefore = mockUSDT.balanceOf(address(escrow));

        vm.warp(uint256(acceptanceDeadline) + 1);
        vm.prank(client);
        escrow.cancelEscrow(escrowId);

        assertEq(
            mockUSDT.balanceOf(address(escrow)),
            contractBalanceBefore - totalAmount
        );
    }

    function test_CancelEscrow_EmitsEscrowCancelledEvent() public {
        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(client);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowCancelled(escrowId, client);
        escrow.cancelEscrow(escrowId);
    }

    function _createEscrow(
        uint256[] memory milestoneAmounts,
        uint64 deadline
    ) internal returns (uint256 newEscrowId) {
        uint256 escrowAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), escrowAmount);
        newEscrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            deadline
        );
        vm.stopPrank();
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
        milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = 1_000e6;
        milestoneAmounts[1] = 2_000e6;
        milestoneAmounts[2] = 3_000e6;
    }

    function _totalAmount(
        uint256[] memory milestoneAmounts
    ) internal pure returns (uint256 amount) {
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            amount += milestoneAmounts[i];
        }
    }
}
