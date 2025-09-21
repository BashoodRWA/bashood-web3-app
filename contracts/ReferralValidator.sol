// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReferralValidator {
    function isValid(address referrer) external view returns (bool);
}

contract ReferralValidator is IReferralValidator {
    address public immutable owner;

    // minimal admin and whitelist to make validator configurable for production use
    mapping(address => bool) public allowedReferrer;
    bool public enforceWhitelist = false; // default: permissive for tests/compat

    event ReferrerUpdated(address indexed referrer, bool allowed);
    event EnforceWhitelistChanged(bool enforced);

    constructor(address _owner) {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Control which referrers are allowed when whitelist enforcement is enabled
    function setAllowedReferrer(address referrer, bool allowed) external onlyOwner {
        allowedReferrer[referrer] = allowed;
        emit ReferrerUpdated(referrer, allowed);
    }

    /// @notice Toggle whitelist enforcement. Default=false for test compatibility.
    function setEnforceWhitelist(bool enforced) external onlyOwner {
        enforceWhitelist = enforced;
        emit EnforceWhitelistChanged(enforced);
    }

    // By default (enforceWhitelist==false) maintain permissive behavior for tests: any non-zero address is valid.
    function isValid(address referrer) external view override returns (bool) {
        if (!enforceWhitelist) {
            return referrer != address(0);
        }
        return allowedReferrer[referrer];
    }
}
