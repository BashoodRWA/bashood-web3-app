// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReferralValidator {
    function isValid(address referrer) external view returns (bool);
}

contract ReferralValidator is IReferralValidator {
    address public immutable owner;

    constructor(address _owner) {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
    }

    // For tests, treat any non-zero address as valid
    function isValid(address referrer) external view override returns (bool) {
        return referrer != address(0);
    }
}
