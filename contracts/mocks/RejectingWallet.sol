// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Simple contract that rejects any plain ETH transfer to simulate project wallet transfer failures
contract RejectingWallet {
    receive() external payable {
        revert("no ETH accepted");
    }

    fallback() external payable {
        revert("no ETH accepted");
    }
}
