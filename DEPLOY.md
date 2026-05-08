Deployment and authorization script

1. Purpose

- This document explains how to run a local Hardhat deployment that deploys `BashoodRescue` and a sample `BashoodPresaleFinal`, then calls `rescue.authorizeCaller(presale)` to grant the presale the ability to call rescue functions.

2. Quick run (local Hardhat node)

- Start a local node (optional): `npx hardhat node`
- Run the script:
  - `node --experimental-specifier-resolution=node scripts/deploy-authorize.js` (if using ESM settings) or
  - `npx hardhat run scripts/deploy-authorize.js --network localhost`

3. Notes

- The script is a minimal example for local testing. For production deployment you should:
  - Use environment-managed private keys (e.g., via .env and hardhat network config)
  - Replace placeholder constructor args with real values
  - Verify roles and ownership carefully

4. Verification

- After running the script, the console will print `is authorized: true` if `authorizeCaller` succeeded.
