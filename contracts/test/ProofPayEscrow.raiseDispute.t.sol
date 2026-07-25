// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowRaiseDisputeTest is Test {
    event DisputeRaised(uint256 indexed escrowId, address indexed raisedBy);

    bytes32 internal constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    uint256 internal constant CLIENT_BALANCE = 20_000e6;
    uint256 internal constant ESCROWS_SLOT = 3;

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    uint256 internal freelancerPrivateKey;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;
    address internal randomUser;
    address internal relayer;

    uint256 internal escrowId;

    function setUp() public {
        freelancerPrivateKey = 0xA11CE;

        admin = makeAddr("admin");
        arbitrator = makeAddr("arbitrator");
        client = makeAddr("client");
        freelancer = vm.addr(freelancerPrivateKey);
        randomUser = makeAddr("randomUser");
        relayer = makeAddr("relayer");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, CLIENT_BALANCE);

        escrowId = _createAcceptedEscrow();
    }

    function test_RaiseDispute_ByClient() public {
        vm.prank(client);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DisputeRaised(escrowId, client);
        escrow.raiseDispute(escrowId);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Disputed)
        );
    }

    function test_RaiseDispute_ByFreelancer() public {
        vm.prank(freelancer);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DisputeRaised(escrowId, freelancer);
        escrow.raiseDispute(escrowId);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Disputed)
        );
    }

    function test_RaiseDispute_RevertsWhenRandomAddressCalls() public {
        vm.prank(randomUser);
        vm.expectRevert(ProofPayEscrow.Unauthorized.selector);
        escrow.raiseDispute(escrowId);
    }

    function test_RaiseDispute_RevertsWhenEscrowNotFound() public {
        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.EscrowNotFound.selector);
        escrow.raiseDispute(999);
    }

    function test_RaiseDispute_RevertsWhenPendingAcceptance() public {
        uint256 pendingEscrowId = _createPendingEscrow();

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.raiseDispute(pendingEscrowId);
    }

    function test_RaiseDispute_RevertsWhenCompleted() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Completed);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.raiseDispute(escrowId);
    }

    function test_RaiseDispute_RevertsWhenCancelled() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Cancelled);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.raiseDispute(escrowId);
    }

    function test_RaiseDispute_RevertsWhenAlreadyDisputed() public {
        _setEscrowState(escrowId, ProofPayEscrow.EscrowState.Disputed);

        vm.prank(client);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.raiseDispute(escrowId);
    }

    function test_RaiseDispute_OnlyChangesEscrowState() public {
        uint256 clientBalanceBefore = mockUSDT.balanceOf(client);
        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);
        uint256 contractBalanceBefore = mockUSDT.balanceOf(address(escrow));

        (
            address clientBefore,
            address freelancerBefore,
            address tokenBefore,
            uint256 totalAmountBefore,
            uint64 deadlineBefore,
            uint8 milestoneBefore,
            ProofPayEscrow.EscrowState stateBefore
        ) = escrow.escrows(escrowId);

        vm.prank(client);
        escrow.raiseDispute(escrowId);

        // Balance assertions
        assertEq(mockUSDT.balanceOf(client), clientBalanceBefore);
        assertEq(mockUSDT.balanceOf(freelancer), freelancerBalanceBefore);
        assertEq(mockUSDT.balanceOf(address(escrow)), contractBalanceBefore);

        // Read values one-by-one instead of unpacking everything again
        (
            address clientAfter,
            address freelancerAfter,
            address tokenAfter,
            uint256 totalAmountAfter,
            uint64 deadlineAfter,
            uint8 milestoneAfter,
            ProofPayEscrow.EscrowState stateAfter
        ) = escrow.escrows(escrowId);

        assertEq(clientAfter, clientBefore);
        assertEq(freelancerAfter, freelancerBefore);
        assertEq(tokenAfter, tokenBefore);
        assertEq(totalAmountAfter, totalAmountBefore);
        assertEq(deadlineAfter, deadlineBefore);
        assertEq(milestoneAfter, milestoneBefore);

        assertEq(uint8(stateBefore), uint8(ProofPayEscrow.EscrowState.Active));
        assertEq(uint8(stateAfter), uint8(ProofPayEscrow.EscrowState.Disputed));

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Disputed)
        );
    }

    function test_RaiseDispute_EmitsDisputeRaisedEvent() public {
        vm.prank(client);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit DisputeRaised(escrowId, client);
        escrow.raiseDispute(escrowId);
    }

    function _createAcceptedEscrow() internal returns (uint256 newEscrowId) {
        newEscrowId = _createPendingEscrow();
        _acceptEscrow(newEscrowId);
    }

    function _createPendingEscrow() internal returns (uint256 newEscrowId) {
        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
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

    function _signAcceptEscrow(
        uint256 privateKey,
        uint256 targetEscrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(ACCEPT_ESCROW_TYPEHASH, targetEscrowId, nonce, deadline)
        );
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

    function _currentMilestone(
        uint256 targetEscrowId
    ) internal view returns (uint8) {
        (, , , , , uint8 currentMilestone, ) = escrow.escrows(targetEscrowId);

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
