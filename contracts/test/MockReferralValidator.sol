// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockReferralValidator {
    function isValid(address) external pure returns (bool) {
        return true; // All addresses are valid for testing
    }
}