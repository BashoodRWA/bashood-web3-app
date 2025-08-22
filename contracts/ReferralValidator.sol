// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReferralValidator {
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }

    // For tests, treat any non-zero address as valid
    function isValid(address referrer) external view returns (bool) {
        return referrer != address(0);
    }
}
