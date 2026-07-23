// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Mock USDT
/// @notice ERC20 test token with 6 decimals, matching USDT-style precision.
contract MockUSDT is ERC20 {
    /// @notice Mints 1,000,000 mUSDT to the deployer for tests.
    constructor() ERC20("Mock USDT", "mUSDT") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Returns USDT-style 6 decimal precision.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mints test tokens to an address.
    /// @dev Unrestricted because this mock is intended only for Foundry tests.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
