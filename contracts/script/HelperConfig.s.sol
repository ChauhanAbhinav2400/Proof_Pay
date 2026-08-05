// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    struct NetworkConfig {
        string name;
        uint256 chainId;
        uint256 deployerKey;
        address admin;
        address arbitrator;
    }

    function activeNetworkConfig() public view returns (NetworkConfig memory) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address arbitrator = 0xd533737250142E1D7b0ece9fFeA60e8d4eA52eCf;
        return
            NetworkConfig({
                name: networkName(block.chainid),
                chainId: block.chainid,
                deployerKey: deployerKey,
                admin: deployer,
                arbitrator: arbitrator
            });
    }

    function networkName(uint256 chainId) public view returns (string memory) {
        if (chainId == 31337) {
            return "anvil";
        }

        if (chainId == 11155111) {
            return "sepolia";
        }

        return string.concat("chain-", vm.toString(chainId));
    }
}
