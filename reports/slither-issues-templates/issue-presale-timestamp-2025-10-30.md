## Title
chore(presale): document and harden timestamp-based price staleness checks

## Severity
Medium / Informational

## Summary
Slither flagged usage of `block.timestamp` for price staleness checks. This is expected for oracle freshness but should be explicitly hardened and documented (thresholds, acceptable window).

## Files / Locations
- contracts/BashoodPresaleFinal.sol
- slither-presale-report.json

## Observed behavior
- Code uses timestamp checks (e.g. `block.timestamp <= updatedAt + maxPriceStaleness`). Static analyzer warns about timestamp dependence.

## Risk
Miners can manipulate timestamps slightly. If `maxPriceStaleness` is too tight, attacks could manipulate outcomes; if too loose, stale prices may be used.

## Suggested remedial actions
- Keep timestamp checks but:
  - use clear `require(updatedAt != 0 && block.timestamp <= updatedAt + maxPriceStaleness, "Price too stale");`
  - set `maxPriceStaleness` to a reasonable default (document rationale, e.g., 5–10 minutes).
  - consider alternative sanity checks or fallback sources.
- Document the chosen thresholds and rationale in the PR.

## Tests to add
- Unit tests: stale price rejected.
- Integration tests: simulated oracles with varying timestamps.

## Branch / PR suggestion
- branch: `chore/presale-timestamp-2025-10-30`

## Labels / Assignees
- labels: security, medium, docs
- assignee: @oracles-team (adjust)

## Notes
Document chosen thresholds in PR and rationale for auditors.
