// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockBHTReturnFalse is ERC20 {
    address public rejectTo;

    constructor(string memory name_, string memory symbol_, address _rejectTo) ERC20(name_, symbol_) {
        rejectTo = _rejectTo;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setRejectTo(address _addr) external {
        rejectTo = _addr;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (to == rejectTo) {
            return false;
        }
        return super.transferFrom(from, to, amount);
    }
}
