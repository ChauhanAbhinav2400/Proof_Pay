// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {ProofPayEscrow} from "../src/ProofPayEscrow.sol";
import {MockUSDT} from "../src/mocks/MockUSDT.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract Deploy is Script {
    function run() external returns (MockUSDT mockUSDT, ProofPayEscrow proofPayEscrow) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.activeNetworkConfig();

        vm.startBroadcast(config.deployerKey);
        mockUSDT = new MockUSDT();
        proofPayEscrow = new ProofPayEscrow(config.admin, config.arbitrator);
        vm.stopBroadcast();

        console2.log("Network:", config.name);
        console2.log("Chain ID:", config.chainId);
        console2.log("Deployer/Admin:", config.admin);
        console2.log("Arbitrator:", config.arbitrator);
        console2.log("MockUSDT:", address(mockUSDT));
        console2.log("ProofPayEscrow:", address(proofPayEscrow));

        _writeDeployment(config.name, config.chainId, address(mockUSDT), address(proofPayEscrow));
    }

    function _writeDeployment(
        string memory networkName,
        uint256 chainId,
        address mockUSDT,
        address proofPayEscrow
    ) internal {
        string memory object = "deployment";
        string memory json = vm.serializeUint(object, "chainId", chainId);
        json = vm.serializeAddress(object, "MockUSDT", mockUSDT);
        json = vm.serializeAddress(object, "ProofPayEscrow", proofPayEscrow);

        string memory path = string.concat(
            vm.projectRoot(),
            "/../deployments/",
            networkName,
            ".json"
        );

        vm.writeJson(json, path);
        console2.log("Deployment written:", path);
    }
}
