// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockTreasuryHandler {
    address public treasury;

    event FeeTransferred(address indexed from, address indexed to, uint256 amount);

    function initialize(address _treasury) public {
        treasury = _treasury;
    }

    function updateTreasuryWallet(address _treasury) public {
        treasury = _treasury;
    }

    function getTreasury() public view returns (address) {
        return treasury == address(0) ? address(this) : treasury;
    }

    function handleTreasuryTransfer(address from, address to, uint256 amount) public {
        emit FeeTransferred(from, to, amount);
    }
}
