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

5. RWA M4 Deployment Protocol (BashoodRWAReference + Modules)

Decision record: Option A / Enforcement A3 — economic truth source via governance (v0.8, 2026-03-02)

Role assignment order (MANDATORY — do not alter sequence):

  Step 1: Deploy BashoodRWAReference (Core) via UUPS proxy
  Step 2: Deploy OracleValuationModule(coreAddress)
  Step 3: Deploy CertificationModule(coreAddress)
  Step 4: Deploy InsuranceModule(coreAddress)
  Step 5: Core.grantRole(ASSET_MANAGER_ROLE, address(oracleValuationModule))
           ⚠️  This is the ONLY account that should hold ASSET_MANAGER_ROLE.
               Do NOT grant ASSET_MANAGER_ROLE to any EOA or multisig.
  Step 6: For each asset: Core.configureTelemetry(tokenId, { oracleAddress: chainlinkFeed })
  Step 7: Smoke test: oracleValuationModule.pushValuation(tokenId)
           Expected: Core.getFinancialData(tokenId).currentValue > 0
                     Event AssetValueUpdated emitted with reason = "ORACLE_REVALUATION"
  Step 8: Verify no EOA has ASSET_MANAGER_ROLE:
           Core.hasRole(ASSET_MANAGER_ROLE, <any-EOA>) must return false

Emergency-only exceptions:
  - Manual appraisal: reason = "ADMIN_APPRAISAL" + governance proposal + off-chain appraiser record
  - Requires temporary ASSET_MANAGER_ROLE grant via multisig, revoked immediately after

Compliance truth sources (do NOT use Core storage for live compliance checks):
  - Certification status: CertificationModule.isCompliant(tokenId, certTypes)
  - Insurance status:     InsuranceModule.isInsured(tokenId)

4. Verification

- After running the script, the console will print `is authorized: true` if `authorizeCaller` succeeded.
