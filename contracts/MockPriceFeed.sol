// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract MockPriceFeed {
    int256 private _answer;
    uint8 private _decimals;
    uint256 private _updatedAt;

    constructor(int256 initialAnswer, uint8 decimals_) {
        _answer = initialAnswer;
        _decimals = decimals_;
        _updatedAt = block.timestamp;
    }

    function setAnswer(int256 newAnswer) public {
        _answer = newAnswer;
        _updatedAt = block.timestamp;
    }

    // Test helpers
    function setUpdatedAt(uint256 ts) public {
        _updatedAt = ts;
    }

    function setPrice(int256 newAnswer) public {
        _answer = newAnswer;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80, int256, uint256, uint256, uint80
        )
    {
        return (0, _answer, 0, _updatedAt, 0);
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}
