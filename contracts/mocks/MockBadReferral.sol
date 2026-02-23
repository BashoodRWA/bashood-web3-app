// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockBadReferral
 * @dev Mock referral contract that always fails to test catch block in presale
 */
contract MockBadReferral {
    function recordPurchase(
        address,
        address,
        uint256,
        uint256
    ) external pure {
        revert("Referral system unavailable");
    }
}
