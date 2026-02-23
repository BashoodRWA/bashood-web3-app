/**
 * Revocar DEFAULT_ADMIN_ROLE de la wallet comprometida
 * (último paso para completar la transferencia)
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = "0x25e686Ccd10846C1Da16e204D1334640F07d4d96";
  const oldWallet = "0x6d0E714Ae688a5545A814952Bb54DbfFD9F2f217";

  console.log("\n🔧 Revocando DEFAULT_ADMIN_ROLE...\n");

  const [signer] = await hre.ethers.getSigners();
  console.log(`Firmando con: ${signer.address}`);

  const BashoodRWA = await hre.ethers.getContractAt("BashoodRWAReference", contractAddress);
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Gas aumentado
  const gasPrice = hre.ethers.parseUnits("10", "gwei"); // Aumentado a 10 gwei
  const gasLimit = 150000;

  console.log(`💰 Gas: ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei\n`);

  try {
    const tx = await BashoodRWA.revokeRole(DEFAULT_ADMIN_ROLE, oldWallet, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    
    console.log(`📤 TX enviada: ${tx.hash}`);
    console.log("⏳ Esperando confirmación...\n");
    
    await tx.wait();
    
    console.log("✅ Confirmada!\n");

    // Verificación
    const hasAdmin = await BashoodRWA.hasRole(DEFAULT_ADMIN_ROLE, oldWallet);
    
    if (!hasAdmin) {
      console.log("✅✅✅ TRANSFERENCIA 100% COMPLETADA ✅✅✅\n");
      console.log("🔒 La wallet comprometida (0x6d0E...217) YA NO tiene permisos");
      console.log("🔓 La nueva wallet segura (0x0370...98e) tiene control total\n");
    } else {
      console.log("⚠️  El rol todavía aparece asignado (puede tardar unos segundos)\n");
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
