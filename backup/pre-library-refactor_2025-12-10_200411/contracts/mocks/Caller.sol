// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPresale {
    function purchaseWithBHT(uint256,uint256,uint256,bytes calldata) external;
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract Caller {
    function callPurchaseWithBHT(address presale, uint256 nftId, uint256 quantity, uint256 nonce, bytes calldata signature) external {
        IPresale(presale).purchaseWithBHT(nftId, quantity, nonce, signature);
    }

    function approveToken(address token, address spender, uint256 amount) external returns (bool) {
        return IERC20(token).approve(spender, amount);
    }
}
