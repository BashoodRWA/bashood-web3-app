// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBashoodRescue {
    function rescueUnsoldNFTs(address nftContract, uint256 nftId, address to, uint256 amount) external;
    function rescueERC20(address tokenAddress, address to, uint256 amount) external;
    function emergencyWithdrawETH() external;
}
