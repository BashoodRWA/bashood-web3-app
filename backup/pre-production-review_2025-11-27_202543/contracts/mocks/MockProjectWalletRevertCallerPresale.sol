// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IPresaleClaim {
    function claimProjectFunds() external;
}

/// @notice Contract that calls claimProjectFunds on a presale and reverts when receiving ETH
contract MockProjectWalletRevertCallerPresale {
    address public presale;

    function doClaim(address _presale) external {
        presale = _presale;
        IPresaleClaim(_presale).claimProjectFunds();
    }

    receive() external payable {
        revert("I refuse ETH");
    }
}
