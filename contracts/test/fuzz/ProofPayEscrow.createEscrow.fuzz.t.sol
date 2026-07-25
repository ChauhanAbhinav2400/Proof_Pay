// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";

contract ProofPayEscrowCreateEscrowFuzzTest is Test {
    uint256 internal constant ESCROWS_SLOT = 3;
    uint96 internal constant MAX_MILESTONE_AMOUNT = 1_000_000e6;

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;

    function setUp() public {
        admin = makeAddr("admin");
        arbitrator = makeAddr("arbitrator");
        client = makeAddr("client");
        freelancer = makeAddr("freelancer");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, uint256(MAX_MILESTONE_AMOUNT) * 3);
    }

    function testFuzz_CreateEscrow_SingleMilestone(uint96 amount) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_MILESTONE_AMOUNT));

        uint256[] memory milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = uint256(amount);

        uint256 escrowId = _createEscrow(
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );

        assertTrue(_escrowExists(escrowId));
        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.PendingAcceptance)
        );
        assertEq(_totalEscrowAmount(escrowId), uint256(amount));
        assertEq(_storedMilestoneAmount(escrowId, 0), uint256(amount));
        assertEq(mockUSDT.balanceOf(address(escrow)), uint256(amount));
    }

    function testFuzz_CreateEscrow_MultipleMilestones(
        uint96 a,
        uint96 b,
        uint96 c
    ) public {
        vm.assume(a > 0 && b > 0 && c > 0);
        a = uint96(bound(a, 1, MAX_MILESTONE_AMOUNT));
        b = uint96(bound(b, 1, MAX_MILESTONE_AMOUNT));
        c = uint96(bound(c, 1, MAX_MILESTONE_AMOUNT));

        uint256 totalAmount = uint256(a) + uint256(b) + uint256(c);
        uint256[] memory milestoneAmounts = new uint256[](3);
        milestoneAmounts[0] = uint256(a);
        milestoneAmounts[1] = uint256(b);
        milestoneAmounts[2] = uint256(c);

        uint256 escrowId = _createEscrow(
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );

        assertEq(_storedMilestoneAmount(escrowId, 0), uint256(a));
        assertEq(_storedMilestoneAmount(escrowId, 1), uint256(b));
        assertEq(_storedMilestoneAmount(escrowId, 2), uint256(c));
        assertEq(_totalEscrowAmount(escrowId), totalAmount);
        assertEq(mockUSDT.balanceOf(address(escrow)), totalAmount);
    }

    function testFuzz_CreateEscrow_RandomAcceptanceDeadline(
        uint96 amount,
        uint256 rawDeadline
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_MILESTONE_AMOUNT));

        uint64 acceptanceDeadline = uint64(
            bound(
                rawDeadline,
                block.timestamp + 1,
                uint256(type(uint64).max)
            )
        );
        uint256[] memory milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = uint256(amount);

        uint256 escrowId = _createEscrow(milestoneAmounts, acceptanceDeadline);

        assertTrue(_escrowExists(escrowId));
        assertEq(_acceptanceDeadline(escrowId), acceptanceDeadline);
        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.PendingAcceptance)
        );
    }

    function _createEscrow(
        uint256[] memory milestoneAmounts,
        uint64 acceptanceDeadline
    ) internal returns (uint256 escrowId) {
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
        escrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            acceptanceDeadline
        );
        vm.stopPrank();
    }

    function _escrowExists(uint256 escrowId) internal view returns (bool) {
        (address storedClient, , , , , , ) = escrow.escrows(escrowId);

        return storedClient != address(0);
    }

    function _escrowState(
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
        (, , , , uint64 storedAcceptanceDeadline, , ) = escrow.escrows(
            escrowId
        );

        return storedAcceptanceDeadline;
    }

    function _totalEscrowAmount(
        uint256 escrowId
    ) internal view returns (uint256) {
        (, , , uint256 totalAmount, , , ) = escrow.escrows(escrowId);

        return totalAmount;
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
            keccak256(abi.encode(escrowId, ESCROWS_SLOT))
        );

        return escrowSlot + 4;
    }

    function _totalAmount(
        uint256[] memory milestoneAmounts
    ) internal pure returns (uint256 totalAmount) {
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            totalAmount += milestoneAmounts[i];
        }
    }
}
