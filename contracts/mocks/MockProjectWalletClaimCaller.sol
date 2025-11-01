// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IRescueClaim {
    function claimEmergencyWithdrawal() external;
}

/// @notice Simple project wallet mock that can call claim and accepts ETH normally
contract MockProjectWalletClaimCaller {
    address public rescue;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /// @notice Call claimEmergencyWithdrawal on the rescue contract
    function doClaim(address _rescue) external {
        rescue = _rescue;
        IRescueClaim(_rescue).claimEmergencyWithdrawal();
    }

    /// @notice Accept ETH without reverting
    receive() external payable {}
}
