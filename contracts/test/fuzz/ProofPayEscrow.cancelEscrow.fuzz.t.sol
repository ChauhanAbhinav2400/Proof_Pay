// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";

contract ProofPayEscrowCancelEscrowFuzzTest is Test {
    uint96 internal constant MAX_ESCROW_AMOUNT = 1_000_000e6;

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

        mockUSDT.mint(client, uint256(MAX_ESCROW_AMOUNT));
    }

    function testFuzz_CancelEscrow_AfterRandomFutureDeadline(
        uint96 amount,
        uint256 rawDeadline
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint64 acceptanceDeadline = uint64(
            bound(rawDeadline, block.timestamp + 1, block.timestamp + 365 days)
        );
        uint256 escrowId = _createEscrow(amount, acceptanceDeadline);
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);
        uint256 contractBalanceBefore = mockUSDT.balanceOf(address(escrow));

        vm.warp(uint256(acceptanceDeadline) + 1);
        vm.prank(client);
        escrow.cancelEscrow(escrowId);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Cancelled)
        );
        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore + amount);
        assertEq(mockUSDT.balanceOf(address(escrow)), contractBalanceBefore - amount);
        assertEq(mockUSDT.balanceOf(address(escrow)), 0);
    }

    function testFuzz_CancelEscrow_ExactRefundAndZeroContractBalance(
        uint96 amount
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_ESCROW_AMOUNT));

        uint64 acceptanceDeadline = uint64(block.timestamp + 7 days);
        uint256 escrowId = _createEscrow(amount, acceptanceDeadline);
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);

        vm.warp(uint256(acceptanceDeadline) + 1);
        vm.prank(client);
        escrow.cancelEscrow(escrowId);

        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore + amount);
        assertEq(mockUSDT.balanceOf(address(escrow)), 0);
    }

    function _createEscrow(
        uint96 amount,
        uint64 acceptanceDeadline
    ) internal returns (uint256 escrowId) {
        uint256[] memory milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = uint256(amount);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), uint256(amount));
        escrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            acceptanceDeadline
        );
        vm.stopPrank();
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
