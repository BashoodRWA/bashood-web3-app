// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./oracles/IPriceFeed.sol";
import "./libs/OwnableLocal.sol";

contract ChainlinkPriceFeed is OwnableLocal {
    IPriceFeed public feed;
    uint256 public stalenessThreshold = 300;
    uint256 public maxChangePct = 50;
    int256 public lastValidAnswer;

    constructor(address _feed) {
        feed = IPriceFeed(_feed);
    }

    function getLatestPrice() external returns (int256 price, uint8 dec, uint256 updatedAt) {
        (, int256 answer, , uint256 uAt, uint80 answeredInRound) = feed.latestRoundData();
        require(uAt != 0, "stale");
        require(answer > 0, "invalid");
        require(answeredInRound != 0, "invalid");
        require(block.timestamp - uAt <= stalenessThreshold, "stale");
        uint8 d = feed.decimals();
        lastValidAnswer = answer;
        return (answer, d, uAt);
    }
}
