/**
 * Transfer Contract Roles - Security Remediation
 * 
 * Transfers all admin roles from compromised wallet to new secure wallet
 * Contract: 0x25e686Ccd10846C1Da16e204D1334640F07d4d96 (Base Sepolia)
 * 
 * From: 0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217 (COMPROMISED - exposed in GitHub)
 * To:   0x0370C18DD149355057CDDD3E636CcF5C97Bf098e (NEW SECURE WALLET)
 */

const hre = require("hardhat");

async function main() {
  console.log("\n🔐 BASHOOD-RWA-1 Role Transfer - Security Remediation");
  console.log("=" + "=".repeat(60) + "\n");

  // Contract address
  const contractAddress = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";
  
  // Wallets
  const compromisedWallet = "0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217";
  const newSecureWallet = "0x0370C18DD149355057CDDD3E636CcF5C97Bf098e";

  console.log("📋 Configuration:");
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   From (COMPROMISED): ${compromisedWallet}`);
  console.log(`   To (NEW SECURE): ${newSecureWallet}\n`);

  // Get signer (should be the compromised wallet for this operation)
  const [signer] = await hre.ethers.getSigners();
  console.log(`🔑 Executing with wallet: ${signer.address}\n`);

  if (signer.address.toLowerCase() !== compromisedWallet.toLowerCase()) {
    console.error("❌ ERROR: You must execute this script with the compromised wallet!");
    console.error(`   Expected: ${compromisedWallet}`);
    console.error(`   Got: ${signer.address}`);
    console.error("\n   Update your .env file to use the compromised private key ONE LAST TIME.");
    process.exit(1);
  }

  // Get contract instance
  const BashoodRWA = await hre.ethers.getContractAt("BashoodRWAReference", contractAddress);

  // Define roles
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ASSET_MANAGER_ROLE = await BashoodRWA.ASSET_MANAGER_ROLE();
  const UPGRADER_ROLE = await BashoodRWA.UPGRADER_ROLE();

  console.log("🔍 Verifying current roles...\n");

  // Verify current roles
  const hasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, compromisedWallet);
  const hasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, compromisedWallet);
  const hasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, compromisedWallet);

  console.log("   Compromised wallet roles:");
  console.log(`   - DEFAULT_ADMIN_ROLE: ${hasAdmin ? "✅ YES" : "❌ NO"}`);
  console.log(`   - ASSET_MANAGER_ROLE: ${hasAssetManager ? "✅ YES" : "❌ NO"}`);
  console.log(`   - UPGRADER_ROLE: ${hasUpgrader ? "✅ YES" : "❌ NO"}\n`);

  if (!hasAdmin) {
    console.error("❌ ERROR: Compromised wallet doesn't have DEFAULT_ADMIN_ROLE!");
    console.error("   Cannot transfer roles without admin privileges.");
    process.exit(1);
  }

  // Confirm before proceeding
  console.log("⚠️  IMPORTANT: This operation will:");
  console.log("   1. Grant all 3 roles to NEW secure wallet");
  console.log("   2. Revoke all 3 roles from COMPROMISED wallet");
  console.log("   3. Compromised wallet will have ZERO access after this\n");

  console.log("🚀 Starting role transfer...\n");

  // STEP 1: Grant roles to new wallet
  console.log("📤 STEP 1/2: Granting roles to new secure wallet...\n");

  try {
    // Grant DEFAULT_ADMIN_ROLE
    console.log("   Granting DEFAULT_ADMIN_ROLE...");
    let tx = await BashoodRWA.grantRole(DEFAULT_ADMIN_ROLE, newSecureWallet);
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ DEFAULT_ADMIN_ROLE granted\n");

    // Grant ASSET_MANAGER_ROLE
    console.log("   Granting ASSET_MANAGER_ROLE...");
    tx = await BashoodRWA.grantRole(ASSET_MANAGER_ROLE, newSecureWallet);
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ ASSET_MANAGER_ROLE granted\n");

    // Grant UPGRADER_ROLE
    console.log("   Granting UPGRADER_ROLE...");
    tx = await BashoodRWA.grantRole(UPGRADER_ROLE, newSecureWallet);
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ UPGRADER_ROLE granted\n");

  } catch (error) {
    console.error("❌ ERROR granting roles:", error.message);
    process.exit(1);
  }

  // STEP 2: Revoke roles from compromised wallet
  console.log("📥 STEP 2/2: Revoking roles from compromised wallet...\n");

  try {
    // Revoke UPGRADER_ROLE first (less critical)
    console.log("   Revoking UPGRADER_ROLE...");
    let tx = await BashoodRWA.revokeRole(UPGRADER_ROLE, compromisedWallet);
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ UPGRADER_ROLE revoked\n");

    // Revoke ASSET_MANAGER_ROLE
    console.log("   Revoking ASSET_MANAGER_ROLE...");
    tx = await BashoodRWA.revokeRole(ASSET_MANAGER_ROLE, compromisedWallet);
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ ASSET_MANAGER_ROLE revoked\n");

    // Revoke DEFAULT_ADMIN_ROLE (last, most critical)
    console.log("   Revoking DEFAULT_ADMIN_ROLE (FINAL STEP)...");
    tx = await BashoodRWA.revokeRole(DEFAULT_ADMIN_ROLE, compromisedWallet);
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log("   ✅ DEFAULT_ADMIN_ROLE revoked\n");

  } catch (error) {
    console.error("❌ ERROR revoking roles:", error.message);
    console.error("\n⚠️  CRITICAL: New wallet has roles but old wallet may still have some!");
    console.error("   Check contract state manually.");
    process.exit(1);
  }

  // STEP 3: Verify final state
  console.log("🔍 STEP 3/3: Verifying final role configuration...\n");

  const newHasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, newSecureWallet);
  const newHasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, newSecureWallet);
  const newHasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, newSecureWallet);

  const oldHasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, compromisedWallet);
  const oldHasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, compromisedWallet);
  const oldHasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, compromisedWallet);

  console.log("   NEW Secure Wallet:");
  console.log(`   - DEFAULT_ADMIN_ROLE: ${newHasAdmin ? "✅ YES" : "❌ NO"}`);
  console.log(`   - ASSET_MANAGER_ROLE: ${newHasAssetManager ? "✅ YES" : "❌ NO"}`);
  console.log(`   - UPGRADER_ROLE: ${newHasUpgrader ? "✅ YES" : "❌ NO"}\n`);

  console.log("   OLD Compromised Wallet:");
  console.log(`   - DEFAULT_ADMIN_ROLE: ${oldHasAdmin ? "⚠️  STILL HAS" : "✅ REVOKED"}`);
  console.log(`   - ASSET_MANAGER_ROLE: ${oldHasAssetManager ? "⚠️  STILL HAS" : "✅ REVOKED"}`);
  console.log(`   - UPGRADER_ROLE: ${oldHasUpgrader ? "⚠️  STILL HAS" : "✅ REVOKED"}\n`);

  // Final check
  if (newHasAdmin && newHasAssetManager && newHasUpgrader && 
      !oldHasAdmin && !oldHasAssetManager && !oldHasUpgrader) {
    console.log("=" + "=".repeat(60));
    console.log("✅ SUCCESS! Role transfer completed successfully");
    console.log("=" + "=".repeat(60) + "\n");
    
    console.log("📋 Next Steps:");
    console.log("   1. ✅ Update .env file with NEW wallet private key");
    console.log("   2. ✅ Delete/secure the compromised private key");
    console.log("   3. ✅ Verify contract on Basescan:");
    console.log(`      https://sepolia.basescan.org/address/${contractAddress}#readContract`);
    console.log("   4. ✅ Test minting with new wallet (optional verification)");
    console.log("   5. ✅ Update grant application docs (mention security rotation)\n");

    console.log("🔒 Security Status:");
    console.log("   ✅ Contract is now controlled by secure wallet");
    console.log("   ✅ Compromised wallet has ZERO access");
    console.log("   ✅ All NFTs remain safe and unchanged");
    console.log("   ✅ Grant application deployment still valid\n");

  } else {
    console.log("=" + "=".repeat(60));
    console.log("⚠️  WARNING: Role transfer may have issues!");
    console.log("=" + "=".repeat(60) + "\n");
    console.log("Please verify the contract state manually on Basescan.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ FATAL ERROR:", error);
    process.exit(1);
  });
