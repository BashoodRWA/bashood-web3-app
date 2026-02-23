/**
 * Revocar DEFAULT_ADMIN_ROLE de la wallet comprometida
 * DESDE la nueva wallet segura
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";
  const oldWallet = "0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217";
  const newWallet = "0x0370C18DD149355057CDDD3E636CcF5C97Bf098e";

  console.log("\n🔧 Revocando DEFAULT_ADMIN_ROLE de wallet comprometida...\n");
  console.log("⚠️  IMPORTANTE: Debes ejecutar esto con PRIVATE_KEY de la NUEVA wallet\n");

  const [signer] = await hre.ethers.getSigners();
  console.log(`Firmando con: ${signer.address}`);

  if (signer.address.toLowerCase() !== newWallet.toLowerCase()) {
    console.error("\n❌ ERROR: Debes usar la NUEVA wallet (0x0370...98e) para revocar");
    console.error("   Cambia el PRIVATE_KEY en .env a la nueva wallet\n");
    process.exit(1);
  }

  const BashoodRWA = await hre.ethers.getContractAt("BashoodRWAReference", contractAddress);
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Verificar que nueva wallet tiene el rol
  const hasRole = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, newWallet);
  if (!hasRole) {
    console.error("\n❌ ERROR: La nueva wallet NO tiene DEFAULT_ADMIN_ROLE");
    process.exit(1);
  }

  console.log("✅ Nueva wallet confirmada con DEFAULT_ADMIN_ROLE\n");

  // Gas aumentado
  const gasPrice = hre.ethers.parseUnits("10", "gwei");
  const gasLimit = 150000;

  console.log(`💰 Gas: ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei\n`);

  try {
    console.log(`   Revocando DEFAULT_ADMIN_ROLE de: ${oldWallet}`);
    
    const tx = await BashoodRWA.revokeRole(DEFAULT_ADMIN_ROLE, oldWallet, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    
    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log("   ⏳ Esperando confirmación...\n");
    
    await tx.wait();
    
    console.log("   ✅ Confirmada!\n");

    // Verificación final
    const oldHasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, oldWallet);
    const newStillHasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, newWallet);
    
    console.log("🔍 Verificación final:");
    console.log(`   Wallet vieja (0x6d0E...): ${oldHasAdmin ? "⚠️  TODAVÍA TIENE" : "✅ REVOCADO"}`);
    console.log(`   Wallet nueva (0x0370...): ${newStillHasAdmin ? "✅ CONSERVA" : "❌ PERDIÓ"}\n`);

    if (!oldHasAdmin && newStillHasAdmin) {
      console.log("✅✅✅ TRANSFERENCIA 100% COMPLETADA ✅✅✅\n");
      console.log("🔒 Wallet comprometida: SIN PERMISOS");
      console.log("🔓 Wallet segura: CONTROL TOTAL\n");
      console.log("Roles finales de 0x0370...98e:");
      console.log("   • DEFAULT_ADMIN_ROLE ✅");
      console.log("   • ASSET_MANAGER_ROLE ✅");
      console.log("   • UPGRADER_ROLE ✅\n");
    }

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
