# Title
fix(presale): investigate & mitigate possible reentrancy in submitProposal

## Severity
High / Security

## Summary
Slither reports a potential reentrancy pattern in `BashoodPresaleFinal.submitProposal(...)`: external token calls (burn/transferFrom) occur and later `nextProposalId` / `proposals[...]` are written. Static analysis flagged state-after-external-call which could be exploitable with a malicious token or callback.

## Files / Locations
- contracts/BashoodPresaleFinal.sol
- slither-presale-report.json (path: ./slither-presale-report.json)
- raw output: analysis/slither-raw-output.txt (lines referencing submitProposal)

## Reproduction steps
1. See PoC in `test/poc.submitProposal.reentrancy.real.test.js` or script `poc-real-run.cjs`.
2. Run Slither JSON and raw output (already attached).
3. Optionally run the PoC script to observe behavior.

## Observed behavior
- Static analyzer flags reentrancy; PoC against current branch shows no successful nested submitProposal (mitigated in practice), but Slither still flags a possible path.

## Risk
A malicious token or receiver could in theory reenter during burn/transferFrom and cause state inconsistencies (e.g., duplicate proposal creation, manipulated deposit accounting) if defenses are not correct.

## Suggested minimal remediation (safe, low friction)
- Import and inherit OpenZeppelin ReentrancyGuard and mark `submitProposal` as `nonReentrant`.
- Use SafeERC20.safeTransferFrom for external token transfers to force revert on failures.
- Alternatively/additionally ensure CEI (checks-effects-interactions) and consider pull-on-failure for outgoing flows.

## Tests to add
- PoC test: `test/poc.submitProposal.reentrancy.real.test.js` demonstrating vulnerable vs patched behavior.
- Unit test asserting proposals state consistent after submitProposal under malicious token reentry.

## Branch / PR suggestion
- branch: `fix/presale-reentrancy-<date>`
- commit: small focused change + PoC tests + updated Slither after-run JSON.

## Labels / Assignees
- labels: security, high, presale
- assignee: @security-team (adjust)

## Notes / Evidence
Attach: `slither-presale-report.json`, `analysis/slither-raw-output.txt`, PoC stdout (`analysis/poc-real-output.txt`).
