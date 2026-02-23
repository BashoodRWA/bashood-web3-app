// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../oracles/IPriceFeed.sol";

/**
 * @title MockPriceFeedAdvanced
 * @dev Advanced mock price feed with answeredInRound control for testing
 */
contract MockPriceFeedAdvanced is IPriceFeed {
    uint8 private _decimals;
    int256 private _answer;
    uint80 private _roundId;
    uint80 private _answeredInRound;
    uint256 private _updatedAt;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _answer = initialAnswer;
        _roundId = 1;
        _answeredInRound = 1;
        _updatedAt = block.timestamp;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _answeredInRound);
    }

    // Admin functions for testing
    function setAnswer(int256 newAnswer) external {
        _answer = newAnswer;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    function setRoundData(uint80 roundId, int256 answer, uint80 answeredInRound) external {
        _roundId = roundId;
        _answer = answer;
        _answeredInRound = answeredInRound;
        _updatedAt = block.timestamp;
    }
}
