// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockProjectWalletRevert {
    receive() external payable {
        revert("I refuse ETH");
    }

    fallback() external payable {
        revert("I refuse ETH");
    }
}
