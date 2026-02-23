/**
 * 🔒 POST-PRESALE PARAMETER LOCK SCRIPT
 * 
 * ⚠️ CRITICAL: Este script debe ejecutarse INMEDIATAMENTE después de que finalice la presale
 * 
 * TIMING:
 * Deployment → Presale Active → Presale Ends → 🔒 RUN THIS SCRIPT → Token Distribution
 *                                                ↑
 *                                             AQUÍ
 * 
 * ⚠️ ESTE SCRIPT ES IRREVERSIBLE
 * Una vez ejecutado, los siguientes parámetros NO PUEDEN ser modificados NUNCA:
 * - burnRate (actualmente: 0.1%)
 * - treasuryFee (actualmente: 0.5%)
 * - treasuryWallet
 * - stakingContract
 * 
 * REQUISITOS PRE-EJECUCIÓN:
 * □ Presale ha finalizado oficialmente
 * □ No hay compras pendientes de procesar
 * □ Todos los fondos recaudados están seguros
 * □ burnRate configurado en valor FINAL deseado
 * □ treasuryFee configurado en valor FINAL deseado
 * □ treasuryWallet es la dirección correcta (multisig recomendado)
 * □ stakingContract configurado si aplica
 * □ Equipo legal ha aprobado valores finales
 * □ Equipo técnico ha validado configuración
 * 
 * USO:
 * 
 * TESTNET (prueba primero):
 * npx hardhat run scripts/post-presale-lock.js --network base-sepolia
 * 
 * MAINNET (producción):
 * npx hardhat run scripts/post-presale-lock.js --network base-mainnet
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const readline = require("readline");

// Helper function para hacer preguntas interactivas
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔒 POST-PRESALE PARAMETER LOCK SCRIPT");
  console.log("=".repeat(80));
  console.log("\n⚠️  WARNING: This action is IRREVERSIBLE!");
  console.log("After locking, economic parameters CANNOT be changed EVER.\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("🔑 Signer:", deployer.address);
  console.log("🌍 Network:", hre.network.name);
  
  // ===========================================
  // STEP 1: Get BashoodToken address
  // ===========================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: BASHOODTOKEN ADDRESS");
  console.log("=".repeat(80));
  
  const tokenAddress = await question("\nEnter BashoodToken contract address: ");
  
  if (!ethers.isAddress(tokenAddress)) {
    throw new Error("❌ Invalid address format");
  }
  
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = BashoodToken.attach(tokenAddress);
  
  console.log("✅ BashoodToken contract loaded:", tokenAddress);
  
  // ===========================================
  // STEP 2: Verify current state
  // ===========================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: CURRENT PARAMETER STATE");
  console.log("=".repeat(80));
  
  try {
    const parametersLocked = await bashoodToken.parametersLocked();
    
    if (parametersLocked) {
      console.log("\n❌ ERROR: Parameters are already locked!");
      console.log("This script has already been executed.");
      console.log("Parameters CANNOT be unlocked.");
      process.exit(1);
    }
    
    console.log("\n✅ Parameters are currently UNLOCKED (mutable)");
    
    // Display current values
    const burnRate = await bashoodToken.burnRate();
    const treasuryFee = await bashoodToken.treasuryFee();
    const treasuryWallet = await bashoodToken.treasuryWallet();
    const stakingContract = await bashoodToken.stakingContract();
    const owner = await bashoodToken.owner();
    
    console.log("\n📊 Current Economic Parameters:");
    console.log("  burnRate:        ", burnRate.toString(), "basis points", `(${Number(burnRate) / 100}%)`);
    console.log("  treasuryFee:     ", treasuryFee.toString(), "basis points", `(${Number(treasuryFee) / 100}%)`);
    console.log("  treasuryWallet:  ", treasuryWallet);
    console.log("  stakingContract: ", stakingContract === ethers.ZeroAddress ? "Not set" : stakingContract);
    console.log("  owner:           ", owner);
    
    // Verify owner
    if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
      console.log("\n❌ ERROR: You are not the owner!");
      console.log("Current owner:", owner);
      console.log("Your address: ", deployer.address);
      process.exit(1);
    }
    
    console.log("\n✅ You are the owner (authorized to lock)");
    
  } catch (error) {
    console.error("\n❌ ERROR reading contract state:", error.message);
    process.exit(1);
  }
  
  // ===========================================
  // STEP 3: Pre-lock checklist
  // ===========================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: PRE-LOCK CHECKLIST (MANDATORY VERIFICATION)");
  console.log("=".repeat(80));
  
  console.log("\n⚠️  Before locking, verify ALL conditions are met:\n");
  
  const checklist = [
    "Presale has officially ended",
    "No pending purchases to process",
    "All raised funds are secure",
    "burnRate is at desired FINAL value",
    "treasuryFee is at desired FINAL value",
    "treasuryWallet is correct address (multisig recommended)",
    "stakingContract is configured (if applicable)",
    "Legal team has approved final values",
    "Technical team has validated configuration",
    "Community has been notified of imminent lock"
  ];
  
  for (let i = 0; i < checklist.length; i++) {
    console.log(`${i + 1}. ${checklist[i]}`);
  }
  
  console.log("\n⚠️  REMINDER: After locking, these functions will PERMANENTLY revert:");
  console.log("  - setBurnRate()");
  console.log("  - setTreasuryFee()");
  console.log("  - setTreasuryWallet()");
  console.log("  - setStakingContract()");
  
  // ===========================================
  // STEP 4: Explicit confirmation
  // ===========================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: EXPLICIT CONFIRMATION REQUIRED");
  console.log("=".repeat(80));
  
  const confirm1 = await question("\nHave you verified ALL items in the checklist above? (yes/no): ");
  
  if (confirm1.toLowerCase() !== "yes") {
    console.log("\n❌ Lock cancelled. Complete checklist verification first.");
    process.exit(0);
  }
  
  const confirm2 = await question("\nDo you understand this action is IRREVERSIBLE? (yes/no): ");
  
  if (confirm2.toLowerCase() !== "yes") {
    console.log("\n❌ Lock cancelled.");
    process.exit(0);
  }
  
  const confirm3 = await question("\nType 'LOCK PARAMETERS' to proceed: ");
  
  if (confirm3 !== "LOCK PARAMETERS") {
    console.log("\n❌ Lock cancelled. Exact phrase not matched.");
    process.exit(0);
  }
  
  // ===========================================
  // STEP 5: Execute lock
  // ===========================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 5: EXECUTING PARAMETER LOCK");
  console.log("=".repeat(80));
  
  console.log("\n🔒 Calling lockParameters()...");
  
  try {
    const tx = await bashoodToken.lockParameters();
    console.log("📡 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Verify lock was successful
    const parametersLocked = await bashoodToken.parametersLocked();
    
    if (!parametersLocked) {
      throw new Error("Lock verification failed - parametersLocked is still false");
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ PARAMETERS SUCCESSFULLY LOCKED");
    console.log("=".repeat(80));
    
    console.log("\n🎉 Economic parameters are now IMMUTABLE:");
    console.log("  burnRate:        LOCKED at", (await bashoodToken.burnRate()).toString(), "bps");
    console.log("  treasuryFee:     LOCKED at", (await bashoodToken.treasuryFee()).toString(), "bps");
    console.log("  treasuryWallet:  LOCKED at", await bashoodToken.treasuryWallet());
    console.log("  stakingContract: LOCKED at", await bashoodToken.stakingContract());
    
    console.log("\n📋 Post-Lock Actions:");
    console.log("  1. ✅ Verify parametersLocked == true on block explorer");
    console.log("  2. ✅ Announce to community: 'Economic parameters permanently locked'");
    console.log("  3. ✅ Update documentation with locked values");
    console.log("  4. ✅ Proceed with token distribution");
    console.log("  5. ✅ Monitor that protected functions now revert");
    
    console.log("\n🔍 Verification URLs:");
    if (hre.network.name === "base-mainnet") {
      console.log(`  BaseScan: https://basescan.org/address/${tokenAddress}#readContract`);
    } else if (hre.network.name === "base-sepolia") {
      console.log(`  BaseScan Testnet: https://sepolia.basescan.org/address/${tokenAddress}#readContract`);
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("🔒 LOCK COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80) + "\n");
    
    // Save lock record
    const lockRecord = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      transactionHash: tx.hash,
      tokenAddress: tokenAddress,
      lockedBy: deployer.address,
      lockedParameters: {
        burnRate: (await bashoodToken.burnRate()).toString(),
        treasuryFee: (await bashoodToken.treasuryFee()).toString(),
        treasuryWallet: await bashoodToken.treasuryWallet(),
        stakingContract: await bashoodToken.stakingContract()
      }
    };
    
    const fs = require("fs");
    const filename = `lock-record-${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(lockRecord, null, 2));
    console.log(`📄 Lock record saved to: ${filename}`);
    
  } catch (error) {
    console.error("\n❌ ERROR executing lockParameters():", error.message);
    
    if (error.message.includes("Already locked")) {
      console.log("\n⚠️  Parameters were already locked in a previous transaction.");
    } else if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("\n⚠️  You are not the owner. Only owner can lock parameters.");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ SCRIPT FAILED:", error);
    process.exit(1);
  });
