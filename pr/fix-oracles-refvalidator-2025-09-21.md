# PR: Fix oracles duplicates & ReferralValidator interface

Summary
-------

This branch contains minimal, targeted fixes to clean up duplicate oracle/interface definitions and to make `ReferralValidator` implement the expected `IReferralValidator` interface used by `BashoodReferral`.

Why
---

- The repo contained duplicate definitions in the Chainlink price feed files which caused confusion in static analysis and maintenance.
- `ReferralValidator` lacked the explicit interface inheritance and `override` on `isValid`, which produced interface-mismatch warnings and static analysis noise.

What changed
------------

- `contracts/oracles/IPriceFeed.sol`: removed duplicate interface declaration; retained canonical interface.
- `contracts/oracles/ChainlinkPriceFeed.sol`: removed duplicate contract definitions; kept single canonical implementation with staleness and max-change checks.
- `contracts/ReferralValidator.sol`: added `IReferralValidator` interface definition locally and made `ReferralValidator` inherit it and mark `isValid` as `override`.

Files changed (local branch)
---------------------------
- contracts/oracles/IPriceFeed.sol
- contracts/oracles/ChainlinkPriceFeed.sol
- contracts/ReferralValidator.sol

Compatibility & Risks
---------------------
- Changes are minimal and intended to be backward-compatible. No external behavior was changed intentionally.
- Still outstanding static analysis warnings (slither) exist across the codebase; many are informational or relate to design choices (e.g., low-level calls in rescue/emergency functions, ERC1155 callback reentrancy patterns). These require further triage and, if necessary, conservative fixes that might touch production contracts (request approval before applying).

Testing
-------

- Ran full test suite locally: 261 passing (see test logs attached to CI run locally).
- Ran Slither; findings saved to `slither-report-after-fix-2025-09-21.json`. The run produced findings that should be triaged but did not block test execution.

Reproduction
------------

```powershell
# from repo root
git checkout -b backup/fix-oracles-refvalidator-2025-09-21
npx hardhat compile
npx hardhat test --show-stack-traces
slither . --json slither-report-after-fix-2025-09-21.json
```

Next steps
----------
- If you want me to triage Slither high-priority findings (BashoodRescue, BashoodPresaleFinal, BashoodMultiToken) I will propose minimal test-mock-only mitigations first and only change production contracts after your explicit approval.
- If desired, I can open the PR remotely (requires git push permissions) or provide the PR body for you to paste.

Signed-off-by: GitHub Copilot
