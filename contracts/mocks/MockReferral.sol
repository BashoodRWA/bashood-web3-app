// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockReferral {
    mapping(address => address) public referrals;
    mapping(address => bool) public rewarded;
    address public owner;

    constructor(address /*_presale*/, address /*_validator*/, address /*_nftContract*/) {
        owner = msg.sender;
    }

    function setReferrer(address user, address referrer) external {
        referrals[user] = referrer;
    }

    function getReferrerOf(address user) external view returns (address) {
        return referrals[user];
    }

    function rewardReferrer(address user, address referrer) external {
        // emulate a permissive reward (no revert)
        referrals[user] = referrer;
        rewarded[user] = true;
    }

    // helpers to inspect state in tests
    function isRewarded(address user) external view returns (bool) {
        return rewarded[user];
    }
}
