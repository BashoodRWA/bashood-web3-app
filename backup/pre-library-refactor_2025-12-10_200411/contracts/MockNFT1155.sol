// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
 
contract MockNFT1155 is ERC1155 {
    constructor() ERC1155("") {}
 
    // Mint estÃ¡ndar para test
    function mintTo(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }
 
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external {
        _mint(to, id, amount, data);
    }
}
 
 
 
 
 
 
 
 
 
 
 
 
 


