# [SECURITY][Medium] unused-return in ChainlinkPriceFeed

### Description
[ChainlinkPriceFeed.peekLatestPrice()](contracts/oracles/ChainlinkPriceFeed.sol#L66-L74) ignores return value by [(None,answer,None,uAt,answeredInRound) = feed.latestRoundData()](contracts/oracles/ChainlinkPriceFeed.sol#L67)

### Location
- File: contracts/oracles/ChainlinkPriceFeed.sol
- Lines: 66;67;68;69;70;71;72;73;74
- Contracts: ChainlinkPriceFeed

### Impact
Medium (confidence: Medium)

### Suggested action
Review and fix

### Notes
Attach slither finding id: 16806d16630fdea3a54a5fea9a6cd1d85de813959eeb142eefc7e84e13398cbf
