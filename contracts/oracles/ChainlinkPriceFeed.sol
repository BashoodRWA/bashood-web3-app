// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../oracles/IPriceFeed.sol";
import "../libs/OwnableLocal.sol";

/**
 * Minimal wrapper around a Chainlink AggregatorV3-like feed.
 * Adds staleness and basic sanity checks.
 */
contract ChainlinkPriceFeed is OwnableLocal {
    IPriceFeed public feed;
    uint256 public stalenessThreshold = 300; // seconds
    uint256 public maxChangePct = 50; // percent, e.g. 50 = 50%
    int256 public lastValidAnswer;

    event FeedUpdated(address indexed feed);
    event StalenessThresholdUpdated(uint256 threshold);
    event MaxChangePctUpdated(uint256 pct);

    constructor(address _feed) {
        feed = IPriceFeed(_feed);
    }

    function setFeed(address _feed) external onlyOwner {
        feed = IPriceFeed(_feed);
        emit FeedUpdated(_feed);
    }

    function setStalenessThreshold(uint256 s) external onlyOwner {
        stalenessThreshold = s;
        emit StalenessThresholdUpdated(s);
    }

    function setMaxChangePct(uint256 p) external onlyOwner {
        maxChangePct = p;
        emit MaxChangePctUpdated(p);
    }

    function getLatestPrice() external returns (int256 price, uint8 dec, uint256 updatedAt) {
        (, int256 answer, , uint256 uAt, uint80 answeredInRound) = feed.latestRoundData();
        require(uAt != 0, "stale: updatedAt=0");
        require(answer > 0, "invalid: answer<=0");
        require(answeredInRound != 0, "invalid: answeredInRound=0");
        // staleness
        require(block.timestamp - uAt <= stalenessThreshold, "stale");

        uint8 d = feed.decimals();

        // basic max change check (if we have a previous value)
        if (lastValidAnswer != 0) {
            uint256 prev = uint256(lastValidAnswer);
            uint256 curr = uint256(answer);
            uint256 diff = prev > curr ? prev - curr : curr - prev;
            if (prev > 0) {
                uint256 pct = (diff * 100) / prev;
                require(pct <= maxChangePct, "change too large");
            }
        }

        lastValidAnswer = answer;
        return (answer, d, uAt);
    }

    /// @notice Non-state-reading helper useful for tests and callers that only need a view.
    function peekLatestPrice() external view returns (int256 price, uint8 dec, uint256 updatedAt) {
        (, int256 answer, , uint256 uAt, uint80 answeredInRound) = feed.latestRoundData();
        require(uAt != 0, "stale: updatedAt=0");
        require(answer > 0, "invalid: answer<=0");
        require(answeredInRound != 0, "invalid: answeredInRound=0");
        require(block.timestamp - uAt <= stalenessThreshold, "stale");
        uint8 d = feed.decimals();
        return (answer, d, uAt);
    }
}
