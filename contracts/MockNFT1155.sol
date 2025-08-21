&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
2×
&nbsp;
&nbsp;
&nbsp;
44×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
&nbsp;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
&nbsp;
contract MockNFT1155 is ERC1155 {
    constructor() ERC1155("") {}
&nbsp;
    // Mint estándar para test
    function mintTo(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }
&nbsp;
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external {
        _mint(to, id, amount, data);
    }
}
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
