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
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
&nbsp;
contract MockBHT is ERC20 {
    constructor() ERC20("Mock BHT", "mBHT") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
&nbsp;
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
&nbsp;
