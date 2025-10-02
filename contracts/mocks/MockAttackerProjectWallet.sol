// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAttackerProjectWallet {
    bool public received;

    event Received(address indexed sender, uint256 amount);

    receive() external payable {
        received = true;
        emit Received(msg.sender, msg.value);
        // intentionally do nothing else — just mark that we received funds
    }

    fallback() external payable {
        received = true;
        emit Received(msg.sender, msg.value);
    }
}
