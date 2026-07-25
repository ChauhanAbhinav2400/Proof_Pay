// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowAcceptEscrowTest is Test {
    event EscrowAccepted(uint256 indexed escrowId, address indexed freelancer);

    bytes32 internal constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    MockUSDT internal mockUSDT;
    ProofPayEscrow internal escrow;

    uint256 internal freelancerPrivateKey;
    uint256 internal wrongSignerPrivateKey;

    address internal admin;
    address internal arbitrator;
    address internal client;
    address internal freelancer;
    address internal relayer;

    uint256 internal escrowId;
    uint64 internal acceptanceDeadline;

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

        uint256[] memory milestoneAmounts = _defaultMilestoneAmounts();
        uint256 totalAmount = _totalAmount(milestoneAmounts);
        acceptanceDeadline = uint64(block.timestamp + 7 days);

        mockUSDT.mint(client, totalAmount);

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

    function test_AcceptEscrow_Success() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowAccepted(escrowId, freelancer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Active)
        );
        assertEq(escrow.nonces(freelancer), 1);
    }

    function test_AcceptEscrow_RevertsWithWrongSigner() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            wrongSignerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function test_AcceptEscrow_RevertsOnReplayAttack() public {
        uint256 deadline = block.timestamp + 1 days;
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

    function test_AcceptEscrow_RevertsWithWrongNonce() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer) + 1,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function test_AcceptEscrow_RevertsWhenSignatureDeadlineExpired() public {
        uint256 deadline = block.timestamp;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function test_AcceptEscrow_RevertsWhenEscrowNotFound() public {
        uint256 missingEscrowId = 999;
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            missingEscrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.EscrowNotFound.selector);
        escrow.acceptEscrow(missingEscrowId, deadline, signature);
    }

    function test_AcceptEscrow_RevertsWhenEscrowStateIsWrong() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        bytes memory secondSignature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidState.selector);
        escrow.acceptEscrow(escrowId, deadline, secondSignature);
    }

    function test_AcceptEscrow_RevertsWhenAcceptanceDeadlineExpired() public {
        uint256 deadline = block.timestamp + 20 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.warp(uint256(acceptanceDeadline) + 1);

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.DeadlineExpired.selector);
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function test_AcceptEscrow_EmitsEscrowAcceptedEvent() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowAccepted(escrowId, freelancer);
        escrow.acceptEscrow(escrowId, deadline, signature);
    }

    function test_AcceptEscrow_IncrementsNonceAfterSuccessfulAcceptance()
        public
    {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        assertEq(escrow.nonces(freelancer), 0);

        vm.prank(relayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(escrow.nonces(freelancer), 1);
    }

    function test_AcceptEscrow_DoesNotIncrementNonceAfterFailedSignature()
        public
    {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            wrongSignerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofPayEscrow.InvalidSignature.selector);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(escrow.nonces(freelancer), 0);
    }

    function test_AcceptEscrow_RandomRelayerCanSubmitValidFreelancerSignature()
        public
    {
        address randomRelayer = makeAddr("randomRelayer");
        uint256 deadline = block.timestamp + 1 days;
        bytes memory signature = _signAcceptEscrow(
            freelancerPrivateKey,
            escrowId,
            escrow.nonces(freelancer),
            deadline
        );

        vm.prank(randomRelayer);
        escrow.acceptEscrow(escrowId, deadline, signature);

        assertEq(
            uint8(_escrowState(escrowId)),
            uint8(ProofPayEscrow.EscrowState.Active)
        );
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
