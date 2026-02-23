/**
 * Revocar roles de la wallet comprometida con gas price aumentado
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";
  const oldWallet = "0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217";

  console.log("\n🔧 Revocando roles de wallet comprometida...\n");

  const [signer] = await hre.ethers.getSigners();
  console.log(`Firmando transacciones con: ${signer.address}`);

  if (signer.address.toLowerCase() !== oldWallet.toLowerCase()) {
    throw new Error("⚠️  ERROR: Debes usar la wallet comprometida para revocar sus propios roles");
  }

  const BashoodRWA = await hre.ethers.getContractAt("BashoodRWAReference", contractAddress);

  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ASSET_MANAGER_ROLE = await BashoodRWA.ASSET_MANAGER_ROLE();
  const UPGRADER_ROLE = await BashoodRWA.UPGRADER_ROLE();

  // Gas price aumentado para Base Sepolia (5 gwei en lugar de 1)
  const gasPrice = hre.ethers.parseUnits("5", "gwei");
  const gasLimit = 100000;

  console.log(`💰 Usando gasPrice: ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei\n`);

  try {
    // Esperar un poco entre transacciones para evitar problemas de nonce
    console.log("   Revocando UPGRADER_ROLE...");
    let tx = await BashoodRWA.revokeRole(UPGRADER_ROLE, oldWallet, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    await tx.wait();
    console.log(`   ✅ TX: ${tx.hash}\n`);

    // Esperar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("   Revocando ASSET_MANAGER_ROLE...");
    tx = await BashoodRWA.revokeRole(ASSET_MANAGER_ROLE, oldWallet, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    await tx.wait();
    console.log(`   ✅ TX: ${tx.hash}\n`);

    // Esperar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("   Revocando DEFAULT_ADMIN_ROLE...");
    tx = await BashoodRWA.revokeRole(DEFAULT_ADMIN_ROLE, oldWallet, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    await tx.wait();
    console.log(`   ✅ TX: ${tx.hash}\n`);

    console.log("✅ COMPLETADO: Todos los roles revocados de la wallet comprometida\n");

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    console.error("Detalles:", error);
    throw error;
  }

  // Verificación final
  console.log("🔍 Verificación final...\n");
  const hasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, oldWallet);
  const hasAssetManager = await BashoodRWA.hasRole(ASSET_MANAGER_ROLE, oldWallet);
  const hasUpgrader = await BashoodRWA.hasRole(UPGRADER_ROLE, oldWallet);

  console.log(`   DEFAULT_ADMIN_ROLE: ${hasAdmin ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}`);
  console.log(`   ASSET_MANAGER_ROLE: ${hasAssetManager ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}`);
  console.log(`   UPGRADER_ROLE: ${hasUpgrader ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}\n`);

  if (!hasAdmin && !hasAssetManager && !hasUpgrader) {
    console.log("✅✅✅ TRANSFERENCIA 100% COMPLETADA ✅✅✅\n");
    console.log("La wallet comprometida YA NO tiene ningún permiso sobre el contrato.\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
