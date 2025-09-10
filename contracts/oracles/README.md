Mini guide: oracles adapters and mocks

- Location: `contracts/oracles/` for adapters and interfaces.
- Mocks go in `contracts/mocks/` and are used by tests/CI.

Policy notes:
- Feed reads do not require LINK (only gas). VRF/Functions/Automation may require LINK funding.
- Owner should be multisig/timelock and able to change feed address via `setFeed`.

Staleness and sanity checks are implemented in `ChainlinkPriceFeed.sol` as an example.
