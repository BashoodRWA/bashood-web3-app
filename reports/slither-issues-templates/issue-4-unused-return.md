# [SECURITY][Medium] unused-return in ChainlinkPriceFeed

### Description
[ChainlinkPriceFeed.getLatestPrice()](contracts/oracles/ChainlinkPriceFeed.sol#L40-L63) ignores return value by [(None,answer,None,uAt,answeredInRound) = feed.latestRoundData()](contracts/oracles/ChainlinkPriceFeed.sol#L41)

### Location
- File: contracts/oracles/ChainlinkPriceFeed.sol
- Lines: 40;41;42;43;44;45;46;47;48;49;50;51;52;53;54;55;56;57;58;59;60;61;62;63
- Contracts: ChainlinkPriceFeed

### Impact
Medium (confidence: Medium)

### Suggested action
Review and fix

### Notes
Attach slither finding id: b6540f9dea7770a502bf5e530d9b2a99f740be706d8ee9af330d21bfd8a9b0d6
