// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";
import {Handler} from "./Handler.sol";

contract ProofPayInvariantTest is StdInvariant, Test {
    MockUSDT internal token;
    ProofPayEscrow internal escrow;
    Handler internal handler;

    function setUp() public {
        address admin = makeAddr("admin");
        address arbitrator = vm.addr(0xA4817A70);

        token = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);
        handler = new Handler(token, escrow);

        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = Handler.createEscrow.selector;
        selectors[1] = Handler.acceptEscrow.selector;
        selectors[2] = Handler.approveMilestone.selector;
        selectors[3] = Handler.cancelEscrow.selector;
        selectors[4] = Handler.raiseDispute.selector;
        selectors[5] = Handler.resolveDispute.selector;

        targetContract(address(handler));
        targetSelector(
            FuzzSelector({addr: address(handler), selectors: selectors})
        );
    }

    function invariant_MoneyConservation() public view {
        uint256 count = handler.escrowCount();

        for (uint256 i = 0; i < count; i++) {
            uint256 initialAmount = handler.initialEscrowAmount(i);
            uint256 remainingFunds = handler.remainingEscrowFunds(i);
            uint256 paidToFreelancer = handler.amountPaidToFreelancer(i);
            uint256 refundedToClient = handler.amountRefundedToClient(i);

            assertEq(
                remainingFunds + paidToFreelancer + refundedToClient,
                initialAmount
            );
        }
    }

    function invariant_MilestoneIndexNeverExceedsLength() public view {
        uint256 count = handler.escrowCount();

        for (uint256 i = 0; i < count; i++) {
            uint256 escrowId = handler.escrowIdAt(i);
            uint256 milestoneLength = handler.milestoneLength(i);
            (, , , , , uint8 currentMilestone, ) = escrow.escrows(escrowId);

            assertLe(uint256(currentMilestone), milestoneLength);
        }
    }

    function invariant_EscrowStateIsValid() public view {
        uint256 count = handler.escrowCount();

        for (uint256 i = 0; i < count; i++) {
            ProofPayEscrow.EscrowState state = _state(handler.escrowIdAt(i));

            assertLe(
                uint8(state),
                uint8(ProofPayEscrow.EscrowState.Cancelled)
            );
        }
    }

    function invariant_CompletedIsTerminal() public view {
        uint256 count = handler.escrowCount();

        for (uint256 i = 0; i < count; i++) {
            if (handler.completedSeen(i)) {
                assertEq(
                    uint8(_state(handler.escrowIdAt(i))),
                    uint8(ProofPayEscrow.EscrowState.Completed)
                );
            }
        }
    }

    function invariant_CancelledIsTerminal() public view {
        uint256 count = handler.escrowCount();

        for (uint256 i = 0; i < count; i++) {
            if (handler.cancelledSeen(i)) {
                assertEq(
                    uint8(_state(handler.escrowIdAt(i))),
                    uint8(ProofPayEscrow.EscrowState.Cancelled)
                );
            }
        }
    }

    function invariant_NoncesNeverDecrease() public view {
        assertFalse(handler.hasNonceDecreased());

        uint256 signerCount = handler.signerCount();
        for (uint256 i = 0; i < signerCount; i++) {
            address signer = handler.signerAt(i);

            assertGe(escrow.nonces(signer), handler.observedNonce(signer));
        }
    }

    function invariant_ProtocolSolvency() public view {
        uint256 remainingLockedFunds;
        uint256 count = handler.escrowCount();

        for (uint256 i = 0; i < count; i++) {
            remainingLockedFunds += handler.remainingEscrowFunds(i);
        }

        assertGe(token.balanceOf(address(escrow)), remainingLockedFunds);
    }

    function _state(
        uint256 escrowId
    ) internal view returns (ProofPayEscrow.EscrowState) {
        (, , , , , , ProofPayEscrow.EscrowState state) = escrow.escrows(
            escrowId
        );

        return state;
    }
}
