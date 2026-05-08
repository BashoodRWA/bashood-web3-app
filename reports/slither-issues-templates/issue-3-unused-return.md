# [SECURITY][Medium] unused-return in ChainlinkPriceFeed

### Description
[ChainlinkPriceFeed.getLatestPrice()](contracts/ChainlinkPriceFeed.sol#L17-L26) ignores return value by [(None,answer,None,uAt,answeredInRound) = feed.latestRoundData()](contracts/ChainlinkPriceFeed.sol#L18)

### Location
- File: contracts/ChainlinkPriceFeed.sol
- Lines: 17;18;19;20;21;22;23;24;25;26
- Contracts: ChainlinkPriceFeed

### Impact
Medium (confidence: Medium)

### Suggested action
Review and fix

### Notes
Attach slither finding id: 2adcc3b6559a110311c8e4b78f7f8a78d64d2f982632ef10d362b271f16ec6de
