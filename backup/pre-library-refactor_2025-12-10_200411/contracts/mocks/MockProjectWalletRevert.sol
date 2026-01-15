// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockProjectWalletRevert {
    receive() external payable {
        revert("I refuse ETH");
    }

    fallback() external payable {
        revert("I refuse ETH");
    }
}
