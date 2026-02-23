// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockTreasuryHandler {
    address public treasury;

    function initialize(address _treasury) external {
        treasury = _treasury;
    }

    function getTreasury() external view returns (address) {
        return treasury;
    }

    event FeeTransferred(address indexed from, address indexed to, uint256 amount);

    function handleTreasuryTransfer(address from, address to, uint256 amount) external {
        emit FeeTransferred(from, to, amount);
    }
}
