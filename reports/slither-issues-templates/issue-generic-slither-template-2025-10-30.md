## Title
[component]: short description of issue / Slither finding

## Severity
(low|medium|high|critical)

## Summary
Short summary of the problem and why it matters.

## Files / Locations
- contracts/...
- slither-report: path/to/file.json
- raw: path/to/analysis/*.txt

## Reproduction steps
1. Run slither with `slither . --json path/to/report.json`
2. Run PoC (if exists): `npx hardhat test test/poc.*`
3. Steps to reproduce locally

## Observed behavior
What Slither reports and what happens when running PoC

## Risk
Explain impact and scope

## Suggested fix (minimal)
Short patch description and low-friction mitigation

## Tests to add
List specific tests (poc/unit/integration)

## Branch / PR suggestion
- Branch name suggestion
- Checklist for PR reviewers

## Labels / Assignees
- labels: security, component
- assignee: @team

## Evidence
Attach slither JSON (before), raw output, PoC stdout
