# [SECURITY][High] reentrancy-eth in LibraVulnerable

### Description
Reentrancy in [LibraVulnerable.withdraw(uint256)](contracts/LibraVulnerable.sol#L20-L32): External calls:

### Location
- File: contracts/LibraVulnerable.sol
- Lines: 20;21;22;23;24;25;26;27;28;29;30;31;32
- Contracts: LibraVulnerable

### Impact
High (confidence: Medium)

### Suggested action
Review and fix

### Notes
Attach slither finding id: a267db2ba85226ee86f2ae0c1b0c7364f3cd340e106d342722df09e6941b6339
