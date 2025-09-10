// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "contracts/oracles/IPriceFeed.sol";

contract MockPriceFeed is IPriceFeed {
    uint8 public immutable override decimals;
    uint80 public roundId;
    int256 public answer;
    uint256 public startedAt;
    uint256 public updatedAt;
    uint80 public answeredInRound;

    constructor(uint8 _decimals, int256 _answer) {
        decimals = _decimals;
        answer = _answer;
        roundId = 1;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
        answeredInRound = 1;
    }

    function setAnswer(int256 _answer) external {
        answer = _answer;
        roundId += 1;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
        answeredInRound = roundId;
    }

    /// @notice set answer and an arbitrary updatedAt (useful for stale tests)
    function setAnswerWithTimestamp(int256 _answer, uint256 _updatedAt) external {
        answer = _answer;
        roundId += 1;
        startedAt = _updatedAt;
        updatedAt = _updatedAt;
        answeredInRound = roundId;
    }

    /// @notice override answeredInRound for testing
    function setAnsweredInRound(uint80 _answeredInRound) external {
        answeredInRound = _answeredInRound;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 _roundId,
            int256 _answer,
            uint256 _startedAt,
            uint256 _updatedAt,
            uint80 _answeredInRound
        )
    {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }
}
