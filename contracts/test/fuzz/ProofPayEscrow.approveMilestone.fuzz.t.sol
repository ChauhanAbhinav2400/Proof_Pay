// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";

contract ProofPayEscrowApproveMilestoneFuzzTest is Test {
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

    uint96 internal constant MAX_MILESTONE_AMOUNT = 1_000_000e6;

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

        mockUSDT.mint(client, uint256(MAX_MILESTONE_AMOUNT) * 10);
    }

    function testFuzz_ApproveMilestone_RandomMilestonesProgressAndTransfers(
        uint8 rawCount,
        uint96 a,
        uint96 b,
        uint96 c,
        uint96 d,
        uint96 e
    ) public {
        uint256[] memory milestoneAmounts = _boundedMilestones(
            rawCount,
            a,
            b,
            c,
            d,
            e
        );
        uint256 escrowId = _createAcceptedEscrow(milestoneAmounts);
        uint256 freelancerBalanceBefore = mockUSDT.balanceOf(freelancer);
        uint256 contractBalanceBefore = mockUSDT.balanceOf(address(escrow));
        uint256 releasedAmount;

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            _approveCurrentMilestone(escrowId);
            releasedAmount += milestoneAmounts[i];

            assertEq(_currentMilestone(escrowId), i + 1);
            assertEq(
                mockUSDT.balanceOf(freelancer),
                freelancerBalanceBefore + releasedAmount
            );
            assertEq(
                mockUSDT.balanceOf(address(escrow)),
                contractBalanceBefore - releasedAmount
            );
        }

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Completed)
        );
    }

    function testFuzz_ApproveMilestone_ReplayProtection(uint96 amount) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_MILESTONE_AMOUNT));

        uint256 escrowId = _createAcceptedEscrow(_singleMilestone(amount));
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

    function testFuzz_ApproveMilestone_NonceBehavior(uint96 amount) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_MILESTONE_AMOUNT));

        uint256 escrowId = _createAcceptedEscrow(_singleMilestone(amount));
        uint256 nonceBefore = escrow.nonces(client);

        _approveCurrentMilestone(escrowId);

        assertEq(escrow.nonces(client), nonceBefore + 1);
    }

    function testFuzz_ApproveMilestone_NonceUnchangedAfterInvalidSignature(
        uint96 amount
    ) public {
        vm.assume(amount > 0);
        amount = uint96(bound(amount, 1, MAX_MILESTONE_AMOUNT));

        uint256 escrowId = _createAcceptedEscrow(_singleMilestone(amount));
        uint256 nonceBefore = escrow.nonces(client);
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            wrongSignerPrivateKey,
            escrowId,
            nonceBefore,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.approveMilestone(escrowId, deadline, signature);

        assertEq(escrow.nonces(client), nonceBefore);
    }

    function _createAcceptedEscrow(
        uint256[] memory milestoneAmounts
    ) internal returns (uint256 escrowId) {
        escrowId = _createPendingEscrow(milestoneAmounts);
        _acceptEscrow(escrowId);
    }

    function _createPendingEscrow(
        uint256[] memory milestoneAmounts
    ) internal returns (uint256 escrowId) {
        uint256 totalAmount = _totalAmount(milestoneAmounts);

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), totalAmount);
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

    function _approveCurrentMilestone(uint256 escrowId) internal {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signApproveMilestone(
            clientPrivateKey,
            escrowId,
            escrow.nonces(client),
            deadline
        );

        vm.prank(relayer);
        escrow.approveMilestone(escrowId, deadline, signature);
    }

    function _boundedMilestones(
        uint8 rawCount,
        uint96 a,
        uint96 b,
        uint96 c,
        uint96 d,
        uint96 e
    ) internal returns (uint256[] memory milestoneAmounts) {
        uint256 count = bound(rawCount, 1, 5);
        uint96[5] memory rawAmounts = [a, b, c, d, e];

        milestoneAmounts = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            vm.assume(rawAmounts[i] > 0);
            milestoneAmounts[i] = bound(
                rawAmounts[i],
                1,
                MAX_MILESTONE_AMOUNT
            );
        }
    }

    function _singleMilestone(
        uint96 amount
    ) internal pure returns (uint256[] memory milestoneAmounts) {
        milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = uint256(amount);
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

    function _signApproveMilestone(
        uint256 privateKey,
        uint256 escrowId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(APPROVE_MILESTONE_TYPEHASH, escrowId, nonce, deadline)
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
