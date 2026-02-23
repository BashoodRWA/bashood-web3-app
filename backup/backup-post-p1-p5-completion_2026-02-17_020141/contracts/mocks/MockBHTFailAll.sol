// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBHTFailAll
 * @dev Mock token that fails BOTH burnFrom AND transferFrom to force "Burn transfer failed"
 */
contract MockBHTFailAll is ERC20 {
    constructor() ERC20("Mock Fail All Token", "FAIL") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burnFrom(address, uint256) external pure {
        revert("burnFrom not supported");
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public pure override returns (bool) {
        // Always return false to trigger "Burn transfer failed"
        return false;
    }

    // Override approve to allow allowance setup
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
}
