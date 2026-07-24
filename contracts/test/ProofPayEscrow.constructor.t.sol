// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";

contract ProofPayEscrowConstructorTest is Test {
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
    }

    function testConstructorGrantsDefaultAdminRole() public {
        assertTrue(escrow.hasRole(escrow.DEFAULT_ADMIN_ROLE(), admin));
    }

    function testConstructorGrantsArbitratorRole() public {
        assertTrue(escrow.hasRole(escrow.ARBITRATOR_ROLE(), arbitrator));
    }

    function testConstructorRevertsWhenAdminIsZeroAddress() public {
        vm.expectRevert(ProofPayEscrow.InvalidAdmin.selector);

        new ProofPayEscrow(address(0), arbitrator);
    }

    function testConstructorRevertsWhenArbitratorIsZeroAddress() public {
        vm.expectRevert(ProofPayEscrow.InvalidArbitrator.selector);

        new ProofPayEscrow(admin, address(0));
    }
}
