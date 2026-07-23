// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*//////////////////////////////////////////////////////////////
                            IMPORTS
//////////////////////////////////////////////////////////////*/

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ProofPay Escrow
/// @notice Initial contract skeleton for the ProofPay escrow protocol.
/// @dev Protocol functions and state transitions are intentionally not implemented in this skeleton.
contract ProofPayEscrow is EIP712, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidAdmin();
    error InvalidArbitrator();
    error InvalidState();
    error InvalidSignature();
    error ZeroAddress();
    error ZeroAmount();
    error EscrowNotFound();
    error Unauthorized();
    error DeadlineExpired();
    error InvalidFreelancer();
    error EmptyMilestoneArray();
    error InvalidAmountDistribution();

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    enum EscrowState {
        PendingAcceptance,
        Active,
        Disputed,
        Completed,
        Cancelled
    }

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Escrow {
        address client;
        address freelancer;
        address paymentToken;
        uint256 totalAmount;
        uint256[] milestoneAmounts;
        uint64 acceptanceDeadline;
        uint8 currentMilestone;
        EscrowState state;
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        address paymentToken,
        uint256 totalAmount
    );

    event EscrowAccepted(uint256 indexed escrowId, address indexed freelancer);

    event MilestoneApproved(
        uint256 indexed escrowId,
        uint8 indexed milestoneIndex,
        uint256 amount
    );

    event DisputeRaised(uint256 indexed escrowId, address indexed raisedBy);

    event DisputeResolved(
        uint256 indexed escrowId,
        address indexed arbitrator,
        uint256 freelancerAward,
        uint256 clientRefund
    );

    event EscrowCancelled(
        uint256 indexed escrowId,
        address indexed cancelledBy
    );

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(uint256 => Escrow) public escrows;

    mapping(address => uint256) public nonces;

    uint256 private _nextEscrowId;

    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    bytes32 private constant ACCEPT_ESCROW_TYPEHASH =
        keccak256(
            "AcceptEscrow(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 private constant APPROVE_MILESTONE_TYPEHASH =
        keccak256(
            "ApproveMilestone(uint256 escrowId,uint256 nonce,uint256 deadline)"
        );

    bytes32 private constant RESOLVE_DISPUTE_TYPEHASH =
        keccak256(
            "ResolveDispute(uint256 escrowId,uint256 freelancerAward,uint256 clientRefund,uint256 nonce,uint256 deadline)"
        );

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address admin, address arbitrator) EIP712("ProofPay", "1") {
        if (admin == address(0)) revert InvalidAdmin();
        if (arbitrator == address(0)) revert InvalidArbitrator();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITRATOR_ROLE, arbitrator);

        _nextEscrowId = 1;
    }

    /*//////////////////////////////////////////////////////////////
                            ESCROW CREATION
    //////////////////////////////////////////////////////////////*/

    function createEscrow(
        address freelancer,
        address paymentToken,
        uint256[] calldata milestoneAmounts,
        uint64 acceptanceDeadline
    ) external nonReentrant returns (uint256 escrowId) {
        if (freelancer == address(0)) revert ZeroAddress();
        if (freelancer == msg.sender) revert InvalidFreelancer();
        if (paymentToken == address(0)) revert ZeroAddress();
        if (milestoneAmounts.length == 0) revert EmptyMilestoneArray();
        if (acceptanceDeadline <= uint64(block.timestamp))
            revert DeadlineExpired();

        uint256 totalAmount;
        uint256 length = milestoneAmounts.length;
        for (uint256 i = 0; i < length; ) {
            uint256 milestoneAmount = milestoneAmounts[i];
            if (milestoneAmount == 0) revert ZeroAmount();

            totalAmount += milestoneAmount;
            unchecked {
                ++i;
            }
        }

        IERC20(paymentToken).safeTransferFrom(
            msg.sender,
            address(this),
            totalAmount
        );
        escrowId = _nextEscrowId;
        unchecked {
            _nextEscrowId++;
        }

        escrows[escrowId] = Escrow({
            client: msg.sender,
            freelancer: freelancer,
            paymentToken: paymentToken,
            totalAmount: totalAmount,
            milestoneAmounts: milestoneAmounts,
            acceptanceDeadline: acceptanceDeadline,
            state: EscrowState.PendingAcceptance,
            currentMilestone: 0
        });

        emit EscrowCreated(
            escrowId,
            msg.sender,
            freelancer,
            paymentToken,
            totalAmount
        );
    }

    /*//////////////////////////////////////////////////////////////
                            ESCROW ACCEPTANCE
    //////////////////////////////////////////////////////////////*/

    function acceptEscrow(
        uint256 escrowId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        address freelancer = escrow.freelancer;
        if (escrow.client == address(0)) revert EscrowNotFound();
        if (escrow.state != EscrowState.PendingAcceptance)
            revert InvalidState();
        if (uint64(block.timestamp) > escrow.acceptanceDeadline)
            revert DeadlineExpired();
        if (deadline <= block.timestamp) revert DeadlineExpired();

        uint256 currentNonce = nonces[freelancer];

        bytes32 structHash = keccak256(
            abi.encode(ACCEPT_ESCROW_TYPEHASH, escrowId, currentNonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(digest, signature);
        if (signer != freelancer) revert InvalidSignature();

        nonces[freelancer] = currentNonce + 1;
        escrow.state = EscrowState.Active;

        emit EscrowAccepted(escrowId, freelancer);
    }

    /*//////////////////////////////////////////////////////////////
                           MILESTONE APPROVAL
    //////////////////////////////////////////////////////////////*/

    function approveMilestone(
        uint256 escrowId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        address client = escrow.client;
        uint8 milestone = escrow.currentMilestone;
        if (escrow.client == address(0)) revert EscrowNotFound();
        if (escrow.state != EscrowState.Active) revert InvalidState();
        if (deadline <= block.timestamp) revert DeadlineExpired();

        uint256 currentNonce = nonces[client];

        bytes32 structHash = keccak256(
            abi.encode(
                APPROVE_MILESTONE_TYPEHASH,
                escrowId,
                currentNonce,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(digest, signature);
        if (signer != client) revert InvalidSignature();

        nonces[client] = currentNonce + 1;

        uint8 approvedMilestone = milestone;
        uint256 amount = escrow.milestoneAmounts[approvedMilestone];

        IERC20(escrow.paymentToken).safeTransfer(escrow.freelancer, amount);

        escrow.currentMilestone++;

        if (milestone == escrow.milestoneAmounts.length) {
            escrow.state = EscrowState.Completed;
        }

        emit MilestoneApproved(escrowId, approvedMilestone, amount);
    }

    /*//////////////////////////////////////////////////////////////
                           ESCROW CANCELLATION
    //////////////////////////////////////////////////////////////*/

    function cancelEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        address client = escrow.client;

        if (client == address(0)) revert EscrowNotFound();
        if (msg.sender != client) revert Unauthorized();
        if (escrow.state != EscrowState.PendingAcceptance)
            revert InvalidState();
        if (uint64(block.timestamp) <= escrow.acceptanceDeadline)
            revert DeadlineExpired();

        IERC20(escrow.paymentToken).safeTransfer(
            escrow.client,
            escrow.totalAmount
        );

        escrow.state = EscrowState.Cancelled;

        emit EscrowCancelled(escrowId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                            DISPUTE RAISING
    //////////////////////////////////////////////////////////////*/

    function raiseDispute(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.client == address(0)) revert EscrowNotFound();
        if (escrow.state != EscrowState.Active) revert InvalidState();
        if (msg.sender != escrow.client && msg.sender != escrow.freelancer)
            revert Unauthorized();

        escrow.state = EscrowState.Disputed;

        emit DisputeRaised(escrowId, msg.sender);
    }

    function resolveDispute(
        uint256 escrowId,
        address arbitrator,
        uint256 freelancerAward,
        uint256 clientRefund,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        IERC20 token = IERC20(escrow.paymentToken);
        if (escrow.client == address(0)) revert EscrowNotFound();
        if (escrow.state != EscrowState.Disputed) revert InvalidState();
        if (deadline <= block.timestamp) revert DeadlineExpired();

        uint256 currentNonce = nonces[arbitrator];

        bytes32 structHash = keccak256(
            abi.encode(
                RESOLVE_DISPUTE_TYPEHASH,
                escrowId,
                freelancerAward,
                clientRefund,
                currentNonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        if (signer != arbitrator || !hasRole(ARBITRATOR_ROLE, signer)) {
            revert InvalidSignature();
        }

        nonces[arbitrator]++;

        uint256 paidAmount;
        for (uint256 i = 0; i < escrow.currentMilestone; ) {
            paidAmount += escrow.milestoneAmounts[i];
            unchecked {
                ++i;
            }
        }

        uint256 remainingBalance = escrow.totalAmount - paidAmount;
        if (freelancerAward + clientRefund != remainingBalance) {
            revert InvalidAmountDistribution();
        }

        token.safeTransfer(escrow.freelancer, freelancerAward);

        token.safeTransfer(escrow.client, clientRefund);

        escrow.state = EscrowState.Completed;

        emit DisputeResolved(escrowId, signer, freelancerAward, clientRefund);
    }
}
