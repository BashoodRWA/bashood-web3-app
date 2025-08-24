// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceFeed {
    int256 public price;
    uint256 public updatedAt;
    uint8 public overrideDecimals = 8;

    function setPrice(int256 _price, uint256 _updatedAt) external {
        price = _price;
        updatedAt = _updatedAt;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, price, updatedAt, updatedAt, 0);
    }

    function decimals() external view returns (uint8) {
        return overrideDecimals;
    }
}
