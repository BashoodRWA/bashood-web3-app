Rescue: nonReentrant check and triage (2025-10-30)

Summary

- Goal: Ensure `BashoodRescue.emergencyWithdrawETH` is protected against reentrancy.
- Findings: `contracts/BashoodRescue.sol` already imports `ReentrancyGuard` and `emergencyWithdrawETH` is declared `nonReentrant`.

Actions taken

1. Verified `contracts/BashoodRescue.sol` — function `emergencyWithdrawETH` is already `onlyRole(EMERGENCY_ROLE) nonReentrant`.
2. Executed PoC tests (existing) that exercise `emergencyWithdrawETH` and reentrancy-related scenarios — tests pass in the current branch (`fix/poc-presale-fix-2025-10-30`).
3. Attempted to run Slither to generate a fresh JSON report, but automatic install failed in this environment; please run Slither locally or allow package install to capture a current static-analysis output. Previous slither runs exist in the repo (`slither-*.json`).

Recommendation

- No production code change is required: `BashoodRescue` already uses `ReentrancyGuard` and the target function is protected.
- PR contents should therefore include:
  - A short note stating no code change was necessary (include the file/line reference).
  - The PoC test references that exercise the behavior: `test/poc.bashoodrescue.reentrancy.test.js`, `test/poc.rescue.emergencyWithdraw.test.cjs`, etc.
  - Attach or link the Slither report (if you can run it) or refer to existing `slither-report-*.json` files in the repo.
  - Coverage snapshot: `./coverage/coverage-final.json` and `./coverage.json` produced earlier.

PR checklist (what remains to do before merge)

- [ ] Add or confirm a focused unit test demonstrating reentrancy is prevented (exists: `test/poc.bashoodrescue.reentrancy.test.js`).
- [ ] Run Slither in CI or locally and attach `slither-report-rescue-2025-10-30.json` to PR.
- [ ] Run the full test suite and coverage in CI (we ran locally: 267 passing, coverage unchanged).
- [ ] Create PR on branch `fix/rescue-nonreentrant-2025-10-30` (or a documentation PR referencing this verification) with the above artifacts.
- [ ] Request security review and merge after approvals.

If you want, I can create the PR branch and push a small commit that adds this `pr/rescue-nonreentrant-2025-10-30.md` file and a short CHANGELOG entry; tell me to proceed and I'll create the branch, commit, push and prepare the PR URL.
