// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IRescueClaim {
    function claimEmergencyWithdrawal() external;
}

/// @notice Contract that calls claimEmergencyWithdrawal and reverts when receiving ETH
contract MockProjectWalletRevertCaller {
    address public rescue;

    function doClaim(address _rescue) external {
        rescue = _rescue;
        IRescueClaim(_rescue).claimEmergencyWithdrawal();
    }

    receive() external payable {
        revert("I refuse ETH");
    }
}
