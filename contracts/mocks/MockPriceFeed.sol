// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../oracles/IPriceFeed.sol";

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

    function setAnswer(int256 _answer) public {
        answer = _answer;
        roundId += 1;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
        answeredInRound = roundId;
    }

    /// @notice set answer and an arbitrary updatedAt (useful for stale tests)
    function setAnswerWithTimestamp(int256 _answer, uint256 _updatedAt) public {
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

    // Backwards-compatibility helpers for older tests that call the
    // alternative mock API (setPrice / setUpdatedAt). These are thin
    // wrappers that delegate to the canonical mock functions so tests
    // don't need to be updated everywhere.
    function setPrice(int256 newAnswer) external {
        setAnswer(newAnswer);
    }

    function setUpdatedAt(uint256 ts) external {
        // preserve current answer but set a custom timestamp
        setAnswerWithTimestamp(answer, ts);
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
