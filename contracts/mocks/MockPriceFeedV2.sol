// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/shared/mocks/MockV3Aggregator.sol";
import "../oracles/IPriceFeed.sol";

/**
 * @title MockPriceFeedV2
 * @notice Wrapper around Chainlink's official MockV3Aggregator using composition
 * @dev Maintains backward compatibility with existing test suite while using
 *      Chainlink's verified implementation for more realistic oracle behavior.
 *      
 *      Uses composition pattern (HAS-A) instead of inheritance to work around
 *      MockV3Aggregator not having virtual functions.
 *      
 *      Key improvements over custom MockPriceFeed:
 *      - Uses Chainlink's official mock (battle-tested)
 *      - answeredInRound properly tracks roundId (validates stale data correctly)
 *      - Maintains all backward-compatible methods (setPrice, setUpdatedAt, etc.)
 *      
 *      Migration from MockPriceFeed:
 *      - Constructor signature: SAME (uint8 decimals, int256 initialAnswer)
 *      - setAnswer(): SAME (increments roundId, sets timestamp)
 *      - setAnswerWithTimestamp(): SAME (custom timestamp support)
 *      - setAnsweredInRound(): NEW - allows stale data testing
 *      - latestRoundData(): IMPROVED - now properly simulates Chainlink behavior
 */
contract MockPriceFeedV2 is IPriceFeed {
    MockV3Aggregator private immutable aggregator;
    
    // Track custom answeredInRound for advanced stale data testing
    uint80 private customAnsweredInRound;
    bool private useCustomAnsweredInRound;

    /**
     * @notice Constructor - 100% backward compatible with MockPriceFeed
     * @param _decimals Number of decimals (e.g., 8 for USD pairs)
     * @param _initialAnswer Initial price (e.g., 200000000000 for $2000 with 8 decimals)
     */
    constructor(uint8 _decimals, int256 _initialAnswer) {
        aggregator = new MockV3Aggregator(_decimals, _initialAnswer);
    }

    /**
     * @notice Get decimals - IPriceFeed interface
     */
    function decimals() external view override returns (uint8) {
        return aggregator.decimals();
    }

    /**
     * @notice Update answer - BACKWARD COMPATIBLE
     * @dev Increments roundId and sets timestamp (same as original MockPriceFeed.setAnswer)
     */
    function setAnswer(int256 _answer) public {
        aggregator.updateAnswer(_answer);
        useCustomAnsweredInRound = false; // Reset custom answeredInRound
    }

    /**
     * @notice Set answer with custom timestamp - BACKWARD COMPATIBLE
     * @dev Useful for testing staleness detection
     */
    function setAnswerWithTimestamp(int256 _answer, uint256 _updatedAt) public {
        // Get current round from aggregator
        (uint80 currentRound,,,,) = aggregator.latestRoundData();
        uint80 nextRound = currentRound + 1;
        
        // Update with custom timestamp
        aggregator.updateRoundData(nextRound, _answer, _updatedAt, _updatedAt);
        useCustomAnsweredInRound = false;
    }

    /**
     * @notice Override answeredInRound for stale data testing - NEW CAPABILITY
     * @dev This is what MockPriceFeed custom had but MockV3Aggregator doesn't
     *      Allows testing the critical `require(answeredInRound >= roundId)` validation
     * @param _answeredInRound Custom answeredInRound value (set < roundId to simulate stale)
     */
    function setAnsweredInRound(uint80 _answeredInRound) external {
        customAnsweredInRound = _answeredInRound;
        useCustomAnsweredInRound = true;
    }
    
    /**
     * @notice Get custom answeredInRound status - FOR DEBUGGING
     */
    function getCustomAnsweredInRoundStatus() external view returns (bool useCustom, uint80 customValue) {
        return (useCustomAnsweredInRound, customAnsweredInRound);
    }

    /**
     * @notice Backward compatibility alias for setAnswer - LEGACY SUPPORT
     */
    function setPrice(int256 newAnswer) external {
        setAnswer(newAnswer);
    }

    /**
     * @notice Backward compatibility for timestamp-only updates - LEGACY SUPPORT
     */
    function setUpdatedAt(uint256 ts) external {
        (uint80 currentRound, int256 currentAnswer,,,) = aggregator.latestRoundData();
        aggregator.updateRoundData(currentRound, currentAnswer, ts, ts);
    }

    /**
     * @notice Override latestRoundData to support custom answeredInRound
     * @dev This is the KEY difference: allows testing stale data scenarios
     *      that the original MockPriceFeed supported but MockV3Aggregator doesn't
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        (roundId, answer, startedAt, updatedAt,) = aggregator.latestRoundData();
        
        // Use custom answeredInRound if set (for stale data testing)
        // Otherwise use roundId (standard Chainlink behavior)
        answeredInRound = useCustomAnsweredInRound ? customAnsweredInRound : roundId;
        
        // DEBUG: Uncomment for debugging
        // console.log("MockPriceFeedV2.latestRoundData():");
        // console.log("  roundId:", roundId);
        // console.log("  answeredInRound:", answeredInRound);
        // console.log("  useCustomAnsweredInRound:", useCustomAnsweredInRound);
    }

    /**
     * @notice Get round data - delegates to aggregator
     */
    function getRoundData(uint80 _roundId)
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
        return aggregator.getRoundData(_roundId);
    }

    /**
     * @notice Expose aggregator address for advanced testing
     */
    function getAggregator() external view returns (address) {
        return address(aggregator);
    }
}
