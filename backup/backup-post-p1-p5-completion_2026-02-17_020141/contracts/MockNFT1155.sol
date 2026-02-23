// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
 
/// @title MockNFT1155
/// @notice Simple ERC1155 mock for testing presale and referral contracts
contract MockNFT1155 is ERC1155 {
    constructor() ERC1155("") {}

    /// @notice Mint tokens to an address (test helper, no access control)
    /// @param to Recipient address
    /// @param id Token ID
    /// @param amount Number of tokens to mint
    function mintTo(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    /// @notice Mint tokens with custom data (test helper, no access control)
    /// @param to Recipient address
    /// @param id Token ID
    /// @param amount Number of tokens to mint
    /// @param data Additional data passed to the receiver hook
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external {
        _mint(to, id, amount, data);
    }
}
 
 
 
 
 
 
 
 
 
 
 
 
 


