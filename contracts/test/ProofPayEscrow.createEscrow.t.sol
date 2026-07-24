// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowCreateEscrowTest is Test {
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        address paymentToken,
        uint256 totalAmount
    );

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;

    uint256 internal constant CLIENT_BALANCE = 20_000e6;

    function setUp() public {
        admin = makeAddr("admin");
        arbitrator = makeAddr("arbitrator");
        client = makeAddr("client");
        freelancer = makeAddr("freelancer");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, CLIENT_BALANCE);
    }

    function test_CreateEscrow_Success() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);
        uint64 acceptanceDeadline = uint64(block.timestamp + 7 days);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
        uint256 escrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            acceptanceDeadline
        );
        vm.stopPrank();

        (
            address storedClient,
            address storedFreelancer,
            address storedPaymentToken,
            uint256 storedTotalAmount,
            uint64 storedAcceptanceDeadline,
            uint8 storedCurrentMilestone,
            ProofPayEscrow.EscrowState storedState
        ) = escrow.escrows(escrowId);

        assertEq(escrowId, 1);
        assertEq(storedClient, client);
        assertEq(storedFreelancer, freelancer);
        assertEq(storedPaymentToken, address(mockUSDT));
        assertEq(storedTotalAmount, totalAmount);
        assertEq(_storedMilestoneLength(escrowId), milestoneAmounts.length);
        assertEq(_storedMilestoneAmount(escrowId, 0), milestoneAmounts[0]);
        assertEq(_storedMilestoneAmount(escrowId, 1), milestoneAmounts[1]);
        assertEq(_storedMilestoneAmount(escrowId, 2), milestoneAmounts[2]);
        assertEq(storedAcceptanceDeadline, acceptanceDeadline);
        assertEq(
            uint8(storedState),
            uint8(ProofPayEscrow.EscrowState.PendingAcceptance)
        );
        assertEq(storedCurrentMilestone, 0);
    }

    function test_CreateEscrow_TransfersFundsToContract() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);
        uint64 acceptanceDeadline = uint64(block.timestamp + 7 days);

        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);
        uint256 escrowBalanceBefore = mockUSDT.balanceOf(address(escrow));

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            acceptanceDeadline
        );
        vm.stopPrank();

        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore - totalAmount);
        assertEq(
            mockUSDT.balanceOf(address(escrow)),
            escrowBalanceBefore + totalAmount
        );
    }

    function test_CreateEscrow_EmitsEscrowCreatedEvent() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);
        uint64 acceptanceDeadline = uint64(block.timestamp + 7 days);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);

        vm.expectEmit(true, true, true, true, address(escrow));
        emit EscrowCreated(
            1,
            client,
            freelancer,
            address(mockUSDT),
            totalAmount
        );

        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            acceptanceDeadline
        );
        vm.stopPrank();
    }

    function test_CreateEscrow_RevertsWhenFreelancerIsZeroAddress() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
        vm.expectRevert(ProofPayEscrow.ZeroAddress.selector);
        escrow.createEscrow(
            address(0),
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
    }

    function test_CreateEscrow_RevertsWhenFreelancerIsClient() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
        vm.expectRevert(ProofPayEscrow.InvalidFreelancer.selector);
        escrow.createEscrow(
            client,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
    }

    function test_CreateEscrow_RevertsWhenPaymentTokenIsZeroAddress() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
        vm.expectRevert(ProofPayEscrow.ZeroAddress.selector);
        escrow.createEscrow(
            freelancer,
            address(0),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
    }

    function test_CreateEscrow_RevertsWhenMilestoneArrayIsEmpty() public {
        uint256[] memory milestoneAmounts = new uint256[](0);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.EmptyMilestoneArray.selector);
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
    }

    function test_CreateEscrow_RevertsWhenMilestoneAmountIsZero() public {
        uint256[] memory milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = 1_000e6;
        milestoneAmounts[1] = 0;
        milestoneAmounts[2] = 2_000e6;

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.ZeroAmount.selector);
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
    }

    function test_CreateEscrow_RevertsWhenAcceptanceDeadlineIsCurrentTimestamp()
        public
    {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp)
        );
    }

    function test_CreateEscrow_RevertsWhenAcceptanceDeadlineIsPastTimestamp()
        public
    {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();

        vm.warp(10);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp - 1)
        );
    }

    function test_CreateEscrow_RevertsWithoutERC20Approval() public {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();

        vm.prank(client);
        vm.expectRevert();
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
    }

    function test_CreateEscrow_RevertsWhenApprovalIsSmallerThanRequiredAmount()
        public
    {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount - 1);
        vm.expectRevert();
        escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
    }

    function test_CreateEscrow_IncrementsEscrowIds() public {
        uint256[] memory firstMilestoneAmounts = _defaultMilestoneAmounts();
        uint256[] memory secondMilestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(firstMilestoneAmounts) +
            _totalAmount(secondMilestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);

        uint256 firstEscrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            firstMilestoneAmounts,
            uint64(block.timestamp + 7 days)
        );

        uint256 secondEscrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            secondMilestoneAmounts,
            uint64(block.timestamp + 8 days)
        );
        vm.stopPrank();

        assertEq(firstEscrowId, 1);
        assertEq(secondEscrowId, 2);
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

    function _storedMilestoneLength(
        uint256 escrowId
    ) internal view returns (uint256) {
        return
            uint256(
                vm.load(address(escrow), bytes32(_milestoneArraySlot(escrowId)))
            );
    }

    function _storedMilestoneAmount(
        uint256 escrowId,
        uint256 index
    ) internal view returns (uint256) {
        uint256 valuesSlot = uint256(
            keccak256(abi.encode(_milestoneArraySlot(escrowId)))
        );

        return uint256(vm.load(address(escrow), bytes32(valuesSlot + index)));
    }

    function _milestoneArraySlot(
        uint256 escrowId
    ) internal pure returns (uint256) {
        uint256 escrowSlot = uint256(
            keccak256(abi.encode(escrowId, uint256(3)))
        );

        return escrowSlot + 4;
    }
}
