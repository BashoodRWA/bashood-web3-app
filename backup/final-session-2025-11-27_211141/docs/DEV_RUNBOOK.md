# Dev runbook — tests, coverage and Slither (Windows PowerShell)

Quick commands to reproduce the test suite, run coverage and run Slither on Windows PowerShell. These were used during the audit work.

Prereqs: node (>=16), npm, repo dependencies installed (run `npm install`).

1) Install dependencies (if not already done):

```powershell
npm install
```

2) Run the full test suite:

```powershell
npx hardhat test
```

3) Run the PoC test that demonstrates `emergencyWithdrawETH` failing when the recipient rejects ETH:

```powershell
npx hardhat test test/poc.rescue.emergency.rejectingWallet.test.cjs --grep PoC
```

4) Generate coverage (solidity-coverage via Hardhat):

```powershell
npx hardhat coverage
# Coverage report will be in ./coverage/ and coverage/coverage-final.json
```

5) Run Slither (if installed):

```powershell
# Requires slither in PATH
slither . --json slither-output.json
# Use scripts/summarize_slither.cjs or scripts/generate_slither_report.cjs to parse slither-output.json
```

Notes
- The project uses Hardhat and some Node scripts. On systems with `package.json` containing `type: "module"`, helper scripts may be `.cjs` to preserve CommonJS `require`.
- The PoC tests are safe (they only deploy contracts and assert behavior). They do not modify production contracts.
