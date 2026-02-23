// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBHTNoBurn
 * @dev Mock BHT token WITHOUT burnFrom function to test burn fallback
 */
contract MockBHTNoBurn is ERC20 {
    constructor() ERC20("Mock Bashood Token No Burn", "MBHT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Deliberately NO burnFrom function
    // This forces presale to use the catch block and transfer to dead address
}
