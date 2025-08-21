&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
1×
&nbsp;
&nbsp;
&nbsp;
&nbsp;// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
&nbsp;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
&nbsp;
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {}
&nbsp;
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
&nbsp;
&nbsp;
