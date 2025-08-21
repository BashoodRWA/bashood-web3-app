&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
30×
&nbsp;
&nbsp;
&nbsp;// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
&nbsp;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
&nbsp;
contract MockBashoodToken is ERC20 {
    constructor() ERC20("Mock BHT", "mBHT") {}
&nbsp;
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
&nbsp;
