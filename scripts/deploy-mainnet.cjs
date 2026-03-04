/**
 * scripts/deploy-mainnet.cjs
 *
 * Bashood Protocol — Full Mainnet Deployment Script
 * ─────────────────────────────────────────────────
 * Network target: Base L2 (Chain ID 8453)
 * Testing:        Hardhat local node / Base Sepolia
 *
 * DEPLOYMENT ORDER (preserves sequential dependencies):
 *
 *   Step 1  — BashoodToken             (BHT)
 *   Step 2  — BashoodVesting           (presale + team + advisors)
 *   Step 3  — BHTVotes                 (governance wrapper for BHT)
 *   Step 4  — BashoodTimelock          (48h delay — governance executor)
 *   Step 5  — BashoodGovernor          (DAO governance)
 *   Step 6  — BashoodTreasury          (protocol treasury)
 *   Step 7  — BashoodRWAReference      (UUPS proxy)
 *   Step 8  — OracleValuationModule    (price feed updater)
 *   Step 9  — FeeDiscountModule        (BHT-tier fee discounts)
 *   Step 10 — Configure roles          (ASSET_MANAGER → only OracleValuationModule)
 *   Step 11 — Configure BashoodToken   (treasuryWallet + stakingContract)
 *   Step 12 — lockParameters()         ← G3: IRREVERSIBLE LOCK (mainnet only)
 *
 * Usage:
 *   # Testnet (skip lockParameters, dry run only)
 *   npx hardhat run scripts/deploy-mainnet.cjs --network base-sepolia
 *
 *   # Mainnet (with lockParameters — requires LOCK_PARAMETERS=true env var)
 *   LOCK_PARAMETERS=true npx hardhat run scripts/deploy-mainnet.cjs --network base
 *
 * Required env vars:
 *   ADMIN_ADDRESS      — Gnosis Safe 3/5 multisig (production admin)
 *   TREASURY_ADDRESS   — Optional: override treasury wallet (defaults to BashoodTreasury)
 *   LOCK_PARAMETERS    — "true" to execute lockParameters() (irreversible!)
 *
 * @author Bashood Protocol
 */

"use strict";

const hre = require("hardhat");
const { ethers } = hre;

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  // Governance parameters
  TIMELOCK_DELAY_MAINNET:  172800,  // 48h in seconds
  TIMELOCK_DELAY_TESTNET:  60,      // 1 minute for testing

  // Vesting shedules — see TOKENOMICS.md v1.1
  VESTING: {
    PRESALE: {
      amount:         250_000_000n * 10n**18n, // 250M BHT
      tgePercent:     20,                       // 20% at TGE
      cliffMonths:    0,
      vestingMonths:  12,
      revocable:      false,
    },
    TEAM: {
      amount:         150_000_000n * 10n**18n, // 150M BHT
      tgePercent:     0,
      cliffMonths:    24,
      vestingMonths:  36,
      revocable:      true,
    },
    ADVISORS: {
      amount:         50_000_000n * 10n**18n,  // 50M BHT
      tgePercent:     0,
      cliffMonths:    12,
      vestingMonths:  24,
      revocable:      true,
    },
    ECOSYSTEM: {
      amount:         200_000_000n * 10n**18n, // 200M BHT
      tgePercent:     0,
      cliffMonths:    6,
      vestingMonths:  42,
      revocable:      false,
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function section(title) {
  const line = "─".repeat(60);
  console.log("\n" + line);
  console.log(`  ${title}`);
  console.log(line);
}

async function deploy(factoryName, args = [], opts = {}) {
  const Factory = await ethers.getContractFactory(factoryName);
  const contract = await Factory.deploy(...args, opts);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  ✅ ${factoryName.padEnd(30)} → ${addr}`);
  return contract;
}

async function deployProxy(factoryName, initArgs, opts = {}) {
  const Factory = await ethers.getContractFactory(factoryName);
  const proxy = await hre.upgrades.deployProxy(Factory, initArgs, {
    initializer: "initialize",
    kind: "uups",
    ...opts,
  });
  await proxy.waitForDeployment();
  const addr = await proxy.getAddress();
  console.log(`  ✅ ${factoryName.padEnd(30)} → ${addr} (UUPS proxy)`);
  return proxy;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const network    = hre.network.name;
  const isMainnet  = network === "base";
  const lockFlag   = process.env.LOCK_PARAMETERS === "true";
  const tge        = Math.floor(Date.now() / 1000); // current timestamp as TGE

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const timelockDelay = isMainnet
    ? CONFIG.TIMELOCK_DELAY_MAINNET
    : CONFIG.TIMELOCK_DELAY_TESTNET;

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         BASHOOD PROTOCOL — MAINNET DEPLOYMENT            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Network:       ${network}`);
  console.log(`  Deployer:      ${deployer.address}`);
  console.log(`  Admin (Safe):  ${adminAddress}`);
  console.log(`  TGE timestamp: ${tge} (${new Date(tge * 1000).toISOString()})`);
  console.log(`  Lock params:   ${lockFlag ? "⚠️  YES — IRREVERSIBLE" : "NO (dry-run safe)"}`);

  // ──────────────────────────────────────
  section("Step 1 — BashoodToken (BHT)");
  // ──────────────────────────────────────
  // treasuryWallet starts as deployer; updated to BashoodTreasury at Step 11
  const token = await deploy("BashoodToken", [deployer.address]);
  const tokenAddr = await token.getAddress();
  console.log(`     Supply: 1,000,000,000 BHT minted to deployer`);

  // ──────────────────────────────────────
  section("Step 2 — BashoodVesting");
  // ──────────────────────────────────────
  const vesting = await deploy("BashoodVesting", [tokenAddr, deployer.address]);
  const vestingAddr = await vesting.getAddress();

  // Approve vesting contract for total vesting allocation
  const vestingAlloc =
    CONFIG.VESTING.PRESALE.amount   +
    CONFIG.VESTING.TEAM.amount      +
    CONFIG.VESTING.ADVISORS.amount  +
    CONFIG.VESTING.ECOSYSTEM.amount;

  console.log(`  Approving ${ethers.formatUnits(vestingAlloc, 18)} BHT for vesting...`);
  await (await token.approve(vestingAddr, vestingAlloc)).wait();

  // NOTE: createSchedule() calls must be done with real beneficiary addresses.
  // In this script we demonstrate with deployer as a placeholder.
  // Production: replace with actual presale contract, team multisig, advisors multisig.
  console.log("  ⚠️  PLACEHOLDER schedules — replace beneficiaries in production:");
  console.log("       PRESALE   → BashoodPresaleFinal contract address");
  console.log("       TEAM      → Team Gnosis Safe address");
  console.log("       ADVISORS  → Advisors multisig address");
  console.log("       ECOSYSTEM → Ecosystem multisig / DAO treasury address");
  console.log("  Skipping createSchedule() — must be called post-deployment");
  console.log("  with actual addresses via: vesting.createSchedule(...)");

  // ──────────────────────────────────────
  section("Step 3 — BHTVotes (governance wrapper)");
  // ──────────────────────────────────────
  const bhtVotes    = await deploy("BHTVotes", [tokenAddr]);
  const bhtVotesAddr = await bhtVotes.getAddress();
  console.log("     Users wrap BHT → BHTv via:  bhtVotes.depositFor(user, amount)");
  console.log("     Then delegate:               bhtVotes.delegate(self)");

  // ──────────────────────────────────────
  section("Step 4 — BashoodTimelock (48h delay)");
  // ──────────────────────────────────────
  // Proposers/executors set after Governor is known; use placeholder here,
  // then grant roles after Governor is deployed (see Step 5b).
  const timelock = await deploy("BashoodTimelock", [
    timelockDelay,
    [],              // proposers — will be granted after Governor deploy
    [],              // executors — will be granted after Governor deploy
    deployer.address // initial admin — renounced after setup
  ]);
  const timelockAddr = await timelock.getAddress();

  // ──────────────────────────────────────
  section("Step 5 — BashoodGovernor");
  // ──────────────────────────────────────
  const governor    = await deploy("BashoodGovernor", [bhtVotesAddr, timelockAddr]);
  const governorAddr = await governor.getAddress();

  // ─── Step 5b: wire Governor ↔ Timelock roles ─────────────────────────────
  console.log("\n  Configuring Timelock roles...");
  const PROPOSER_ROLE  = ethers.id("PROPOSER_ROLE");
  const EXECUTOR_ROLE  = ethers.id("EXECUTOR_ROLE");
  const CANCELLER_ROLE = ethers.id("CANCELLER_ROLE");
  const ADMIN_ROLE     = await timelock.DEFAULT_ADMIN_ROLE();

  await (await timelock.grantRole(PROPOSER_ROLE,  governorAddr)).wait();
  await (await timelock.grantRole(CANCELLER_ROLE, governorAddr)).wait();
  await (await timelock.grantRole(EXECUTOR_ROLE,  ethers.ZeroAddress)).wait(); // anyone executes
  await (await timelock.revokeRole(ADMIN_ROLE,    deployer.address)).wait();   // renounce admin

  console.log(`  ✅ PROPOSER_ROLE  → ${governorAddr} (Governor)`);
  console.log(`  ✅ CANCELLER_ROLE → ${governorAddr} (Governor)`);
  console.log(`  ✅ EXECUTOR_ROLE  → ${ethers.ZeroAddress} (anyone)`);
  console.log(`  ✅ ADMIN_ROLE     revoked from deployer (trustless)`);

  // ──────────────────────────────────────
  section("Step 6 — BashoodTreasury");
  // ──────────────────────────────────────
  const treasury    = await deploy("BashoodTreasury", [tokenAddr, adminAddress, timelockAddr]);
  const treasuryAddr = await treasury.getAddress();
  console.log(`     SPENDER_ROLE → ${timelockAddr} (Timelock)`);
  console.log(`     ADMIN_ROLE   → ${adminAddress}  (Gnosis Safe)`);

  // ──────────────────────────────────────
  section("Step 7 — BashoodRWAReference (UUPS proxy)");
  // ──────────────────────────────────────
  const rwa     = await deployProxy("BashoodRWAReference", [
    "Bashood Industrial Assets",
    "BIA",
    "https://metadata.bashood.com/",
    adminAddress,
  ]);
  const rwaAddr = await rwa.getAddress();

  // ──────────────────────────────────────
  section("Step 8 — OracleValuationModule");
  // ──────────────────────────────────────
  const oracle    = await deploy("OracleValuationModule", [rwaAddr, adminAddress]);
  const oracleAddr = await oracle.getAddress();

  // ──────────────────────────────────────
  section("Step 9 — FeeDiscountModule");
  // ──────────────────────────────────────
  const feeDiscount    = await deploy("FeeDiscountModule", [tokenAddr, adminAddress]);
  const feeDiscountAddr = await feeDiscount.getAddress();

  // ──────────────────────────────────────
  section("Step 10 — Configure RWA roles");
  // ──────────────────────────────────────
  const ASSET_MANAGER_ROLE = ethers.id("ASSET_MANAGER_ROLE");
  const ORACLE_ROLE        = ethers.id("ORACLE_ROLE");
  const UPGRADER_ROLE      = ethers.id("UPGRADER_ROLE");
  const DEFAULT_ADMIN      = await rwa.DEFAULT_ADMIN_ROLE();

  // Grant OracleValuationModule the ORACLE_ROLE (it needs it to push valuations)
  await (await rwa.grantRole(ORACLE_ROLE,   oracleAddr)).wait();
  console.log(`  ✅ ORACLE_ROLE        → ${oracleAddr}`);

  // Grant timelockAddr UPGRADER_ROLE (governance controls upgrades)
  await (await rwa.grantRole(UPGRADER_ROLE, timelockAddr)).wait();
  console.log(`  ✅ UPGRADER_ROLE      → ${timelockAddr} (Timelock/governance)`);

  // IMPORTANT: ASSET_MANAGER_ROLE stays with adminAddress (Gnosis Safe) for sign-off.
  // In production, revoke from deployer if deployer ≠ adminAddress.
  if (deployer.address.toLowerCase() !== adminAddress.toLowerCase()) {
    await (await rwa.revokeRole(ASSET_MANAGER_ROLE, deployer.address)).wait();
    await (await rwa.revokeRole(DEFAULT_ADMIN,        deployer.address)).wait();
    console.log(`  ✅ Roles revoked from deployer EOA — admin is now ${adminAddress}`);
  } else {
    console.log("  ⚠️  deployer == adminAddress — manually revoke deployer after Safe setup");
  }

  // ──────────────────────────────────────
  section("Step 11 — Configure BashoodToken");
  // ──────────────────────────────────────
  // Point treasury fee to BashoodTreasury
  await (await token.setTreasuryWallet(treasuryAddr)).wait();
  console.log(`  ✅ treasuryWallet    → ${treasuryAddr} (BashoodTreasury)`);

  // Point stakingContract to BashoodTimelock (governance rewards pool)
  await (await token.setStakingContract(timelockAddr)).wait();
  console.log(`  ✅ stakingContract   → ${timelockAddr} (BashoodTimelock / governance)`);

  // Transfer token ownership to adminAddress (Gnosis Safe)
  if (deployer.address.toLowerCase() !== adminAddress.toLowerCase()) {
    await (await token.transferOwnership(adminAddress)).wait();
    console.log(`  ✅ token.owner      → ${adminAddress} (transferred to Gnosis Safe)`);
  } else {
    console.log("  ⚠️  token.owner still deployer — transfer to Gnosis Safe before lockParameters");
  }

  // ──────────────────────────────────────
  section("Step 12 — lockParameters()  ← G3 CRITICAL");
  // ──────────────────────────────────────
  if (lockFlag) {
    if (!isMainnet) {
      console.log("  ⚠️  LOCK_PARAMETERS=true on non-mainnet network — proceeding anyway");
    }
    console.log("  🔒 Calling lockParameters()...");
    const tx = await token.lockParameters();
    const receipt = await tx.wait();
    const locked = await token.parametersLocked();
    console.log(`  ✅ lockParameters() executed  (block: ${receipt.blockNumber})`);
    console.log(`     parametersLocked = ${locked}`);
    console.log("     burnRate, treasuryFee, treasuryWallet, stakingContract: FROZEN FOREVER");
  } else {
    console.log("  ⏭️  SKIPPED (LOCK_PARAMETERS != 'true')");
    console.log("     To lock: LOCK_PARAMETERS=true npx hardhat run scripts/deploy-mainnet.cjs");
    console.log("     ⚠️  Do NOT open presale until lockParameters() is called.");
  }

  // ──────────────────────────────────────
  section("Deployment Summary");
  // ──────────────────────────────────────
  const addresses = {
    BashoodToken:           tokenAddr,
    BashoodVesting:         vestingAddr,
    BHTVotes:               bhtVotesAddr,
    BashoodTimelock:        timelockAddr,
    BashoodGovernor:        governorAddr,
    BashoodTreasury:        treasuryAddr,
    BashoodRWAReference:    rwaAddr,
    OracleValuationModule:  oracleAddr,
    FeeDiscountModule:      feeDiscountAddr,
  };

  for (const [name, addr] of Object.entries(addresses)) {
    console.log(`  ${name.padEnd(26)}: ${addr}`);
  }

  console.log("\n  BaseScan links:");
  const explorer = isMainnet
    ? "https://basescan.org/address/"
    : "https://sepolia.basescan.org/address/";
  for (const [, addr] of Object.entries(addresses)) {
    console.log(`  ${explorer}${addr}`);
  }

  console.log("\n  Post-deployment checklist:");
  console.log("  [ ] Run vesting.createSchedule() for each beneficiary category");
  console.log("  [ ] Verify all contracts on BaseScan");
  console.log("  [ ] Transfer vesting.transferOwnership() to Gnosis Safe");
  console.log("  [ ] Test governance round-trip on testnet");
  console.log("  [ ] External security audit before mainnet lockParameters()");
  console.log("  [ ] lockParameters() — only after audit is complete");

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║               DEPLOYMENT COMPLETE ✅                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  return addresses;
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err);
  process.exitCode = 1;
});
