// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IRescueClaim {
    function claimEmergencyWithdrawal() external;
}

/// @notice Mock project wallet that attempts to reenter claimEmergencyWithdrawal when receiving ETH
contract MockProjectWalletReentrant {
    address public rescue;
    address public owner;

    constructor(address _rescue) {
        rescue = _rescue;
        owner = msg.sender;
    }

    /// @notice Trigger the claim from this contract (so msg.sender == this contract)
    function doClaim() external {
        IRescueClaim(rescue).claimEmergencyWithdrawal();
    }

    /// @notice When receiving ETH, attempt to reenter claim
    receive() external payable {
        // attempt to reenter; if the rescue zeroes before external call this should do nothing
        IRescueClaim(rescue).claimEmergencyWithdrawal();
    }
}
