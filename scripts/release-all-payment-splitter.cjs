const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("💰 RELEASE ALL: Distribuir a todos los payees");
  console.log("=".repeat(80));

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  
  const PAYMENT_SPLITTER_ADDRESS = process.env.PAYMENT_SPLITTER_ADDRESS || "0x...";
  
  if (PAYMENT_SPLITTER_ADDRESS === "0x...") {
    console.log("\n❌ ERROR: Debes configurar PAYMENT_SPLITTER_ADDRESS en .env");
    console.log("   export PAYMENT_SPLITTER_ADDRESS=0x...");
    process.exit(1);
  }

  // ============================================
  // CONECTAR AL CONTRATO
  // ============================================
  
  const [signer] = await ethers.getSigners();
  
  console.log(`\n📋 Configuración:`);
  console.log(`  Ejecutado por: ${signer.address}`);
  console.log(`  PaymentSplitter: ${PAYMENT_SPLITTER_ADDRESS}\n`);

  const paymentSplitter = await ethers.getContractAt(
    "BashoodPaymentSplitter",
    PAYMENT_SPLITTER_ADDRESS
  );

  // ============================================
  // OBTENER INFO DE PAYEES
  // ============================================
  
  console.log("🔍 Obteniendo información de payees...\n");
  
  const info = await paymentSplitter.getDistributionInfo();
  const balance = await ethers.provider.getBalance(PAYMENT_SPLITTER_ADDRESS);
  const totalShares = info.shares.reduce((a, b) => a + b, 0n);
  
  console.log(`💰 Balance del contrato: ${ethers.formatEther(balance)} ETH\n`);
  
  const payeeNames = ["Development", "Operations", "Marketing", "Treasury"];
  
  console.log("📊 Fondos a distribuir:");
  console.log("─".repeat(80));
  
  let totalToRelease = 0n;
  
  for (let i = 0; i < info.payees.length; i++) {
    const releasable = await paymentSplitter.releasable(info.payees[i]);
    const sharePercent = (Number(info.shares[i]) * 100 / Number(totalShares)).toFixed(2);
    
    totalToRelease += releasable;
    
    console.log(`  ${payeeNames[i] || `Payee ${i + 1}`} (${sharePercent}%):`);
    console.log(`    Address:   ${info.payees[i]}`);
    console.log(`    A recibir: ${ethers.formatEther(releasable)} ETH`);
    
    if (releasable > 0) {
      console.log(`    Status:    ⚠️  Pendiente`);
    } else {
      console.log(`    Status:    ✅ Ya reclamado`);
    }
    console.log();
  }

  console.log("─".repeat(80));
  console.log(`  Total a distribuir: ${ethers.formatEther(totalToRelease)} ETH\n`);

  if (totalToRelease === 0n) {
    console.log("⚠️  No hay fondos pendientes de distribuir");
    console.log("   Todos los payees ya reclamaron sus fondos\n");
    process.exit(0);
  }

  // ============================================
  // CONFIRMAR DISTRIBUCIÓN
  // ============================================
  
  console.log("⚠️  CONFIRMACIÓN:");
  console.log(`   Vas a distribuir ${ethers.formatEther(totalToRelease)} ETH a ${info.payees.length} wallets`);
  console.log(`   Gas estimado: ~${(info.payees.length * 50000)} gas por payee`);
  console.log("\n   Presiona Ctrl+C para cancelar o espera 5 segundos...\n`);
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // ============================================
  // EJECUTAR RELEASE ALL
  // ============================================
  
  console.log("💸 Distribuyendo fondos...\n");
  
  try {
    const tx = await paymentSplitter.releaseAll();
    console.log(`   Tx hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt.blockNumber}`);
    
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ETH distribuido: ${ethers.formatEther(totalToRelease)} ETH`);
    console.log(`   Gas pagado:      ${ethers.formatEther(gasCost)} ETH`);
    console.log(`   Payees:          ${info.payees.length}`);
    
    // Verificar balances finales
    console.log(`\n✅ Distribución completada. Verificando balances...\n`);
    
    for (let i = 0; i < info.payees.length; i++) {
      const releasableAfter = await paymentSplitter.releasable(info.payees[i]);
      console.log(`  ${payeeNames[i]}: ${releasableAfter === 0n ? '✅' : '⚠️'} ${ethers.formatEther(releasableAfter)} ETH pendiente`);
    }
    
    console.log("\n✅ Todos los fondos han sido distribuidos\n");
    
  } catch (error) {
    console.error("\n❌ Error al distribuir fondos:");
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
