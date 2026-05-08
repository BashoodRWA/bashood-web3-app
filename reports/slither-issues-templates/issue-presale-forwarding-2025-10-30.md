## Title
fix(presale): handle forwarding ETH to projectWallet safely (pull-payments / nonReentrant)

## Severity
High / Security / Funds

## Summary
Slither flags low-level `projectWallet.call{value: amount}("")` usage in `purchaseWithETH(...)` as a potential "send ETH to arbitrary destination" and possible reentrancy vector. The current behavior forwards ETH directly and the static analysis suggests risk if projectWallet is a contract with fallback logic.

## Files / Locations
- contracts/BashoodPresaleFinal.sol
- slither-presale-report.json
- analysis/slither-raw-output.txt (entries about purchaseWithETH and low-level call)

## Reproduction steps
1. Review Slither finding showing `purchaseWithETH` forward.
2. Optionally create a malicious projectWallet mock that reenters in fallback and run PoC.

## Observed behavior
- Forward happens in the same transaction via low-level call; Slither marks this as risky.

## Risk
If forwarding occurs before state is finalized or without reentrancy protection, a malicious projectWallet could reenter or cause inconsistent state or loss of funds.

## Suggested minimal remediation
- Implement pull-payment fallback: accumulate amounts for `projectWallet` in `pendingWithdrawals[projectWallet]` when a forward fails or always use pull pattern.
- Mark `purchaseWithETH` (and any function performing external forwards) as `nonReentrant`.
- If keeping push behavior, check call result and revert on failure, or better: update state → then attempt forward → if fails, store for withdraw.

## Tests to add
- Test where projectWallet reverts or attempts to reenter; assert no state corruption and that funds can be withdrawn via `withdrawPending` (or `claimPendingWithdrawals`).
- Test that successful forwards still complete correctly.

## Branch / PR suggestion
- branch: `fix/presale-forwarding-2025-10-30`
- include: updated presale, new mapping pendingWithdrawals, withdrawPending function, PoC tests.

## Labels / Assignees
- labels: security, funds, presale
- assignee: @payments-team (adjust)

## Evidence / Notes
Attach: `slither-presale-report.json`, raw logs, PoC outputs.
