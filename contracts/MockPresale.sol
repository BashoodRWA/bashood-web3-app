// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IBashoodRescue.sol";

contract MockPresale {
    address public rescue;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function setRescueContract(address _rescue) external {
        require(msg.sender == owner, "only owner");
        rescue = _rescue;
    }

    function delegateRescueUnsoldNfts(address nftContract, uint256 nftId, address to, uint256 amount) external {
        require(rescue != address(0), "no rescue");
        IBashoodRescue(rescue).rescueUnsoldNFTs(nftContract, nftId, to, amount);
    }

    function delegateRescueErc20(address tokenAddress, address to, uint256 amount) external {
        require(rescue != address(0), "no rescue");
        IBashoodRescue(rescue).rescueERC20(tokenAddress, to, amount);
    }

    function delegateEmergencyWithdrawEth(address payable projectWallet) external {
        require(rescue != address(0), "no rescue");
        IBashoodRescue(rescue).emergencyWithdrawETH(projectWallet);
    }
}
