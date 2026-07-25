// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../../src/ProofPayEscrow.sol";
import {MockUSDT} from "../../src/mocks/MockUSDT.sol";

contract ProofPayEscrowAcceptEscrowFuzzTest is Test {
    bytes32 internal constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    uint96 internal constant MILESTONE_AMOUNT = 1_000e6;

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    uint256 internal freelancerPrivateKey;
    uint256 internal wrongSignerPrivateKey;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;
    address internal relayer;

    function setUp() public {
        freelancerPrivateKey = 0xA11CE;
        wrongSignerPrivateKey = 0xB0B;

        admin = makeAddr("admin");
        arbitrator = makeAddr("arbitrator");
        client = makeAddr("client");
        freelancer = vm.addr(freelancerPrivateKey);
        relayer = makeAddr("relayer");

        mockUSDT = new MockUSDT();
        escrow = new ProofPayEscrow(admin, arbitrator);

        mockUSDT.mint(client, 1_000_000e6);
    }

    function testFuzz_AcceptEscrow_RandomSignatureDeadline(
        uint256 rawDeadline
    ) public {
        uint256 escrowId = _createPendingEscrow();
        uint256 deadline = bound(
            rawDeadline,
            block.timestamp + 1,
            block.timestamp + 365 days
        );
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(uint8(_escrowState(escrowId)), uint8(ProofPayEscrow.EscrowState.Active));
    }

    function testFuzz_AcceptEscrow_RandomValidNonce(uint8 rawNonceSteps) public {
        uint8 nonceSteps = uint8(bound(rawNonceSteps, 0, 5));
        _consumeFreelancerNonces(nonceSteps);

        uint256 escrowId = _createPendingEscrow();
        uint256 currentNonce = escrow.nonces(freelancer);
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            currentNonce,
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(escrow.nonces(freelancer), currentNonce + 1);
        assertEq(uint8(_escrowState(escrowId)), uint8(ProofPayEscrow.EscrowState.Active));
    }

    function testFuzz_AcceptEscrow_ReplayProtection(uint256 rawDeadline) public {
        uint256 escrowId = _createPendingEscrow();
        uint256 deadline = bound(
            rawDeadline,
            block.timestamp + 1,
            block.timestamp + 365 days
        );
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        vm.prank(relayer);
        vm.expectRevert();
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function testFuzz_AcceptEscrow_InvalidSignature(uint8 rawNonceSteps) public {
        uint8 nonceSteps = uint8(bound(rawNonceSteps, 0, 5));
        _consumeFreelancerNonces(nonceSteps);

        uint256 escrowId = _createPendingEscrow();
        uint256 nonceBefore = escrow.nonces(freelancer);
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            wrongSignerPrivateKey,
            escrowId,
            nonceBefore,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(escrow.nonces(freelancer), nonceBefore);
    }

    function testFuzz_AcceptEscrow_NonceBehavior(uint8 rawNonceSteps) public {
        uint8 nonceSteps = uint8(bound(rawNonceSteps, 0, 5));
        _consumeFreelancerNonces(nonceSteps);

        uint256 escrowId = _createPendingEscrow();
        uint256 nonceBefore = escrow.nonces(freelancer);
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            nonceBefore,
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(escrow.nonces(freelancer), nonceBefore + 1);
    }

    function _consumeFreelancerNonces(uint8 count) internal {
        for (uint256 i = 0; i < count; i++) {
            uint256 escrowId = _createPendingEscrow();
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
    }

    function _createPendingEscrow() internal returns (uint256 escrowId) {
        uint256[] memory milestoneAmounts = new uint256[](1);
        milestoneAmounts[0] = MILESTONE_AMOUNT;

        vm.startPrank(client);
        mockUSDT.approve(address(escrow), MILESTONE_AMOUNT);
        escrowId = escrow.createEscrow(
            freelancer,
            address(mockUSDT),
            milestoneAmounts,
            uint64(block.timestamp + 7 days)
        );
        vm.stopPrank();
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
