const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 MONITOR: BashoodPaymentSplitter");
  console.log("=".repeat(80));

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  
  // TODO: Actualizar con las direcciones reales después del deployment
  const PAYMENT_SPLITTER_ADDRESS = process.env.PAYMENT_SPLITTER_ADDRESS || "0x...";
  
  if (PAYMENT_SPLITTER_ADDRESS === "0x...") {
    console.log("\n⚠️  IMPORTANTE: Actualiza PAYMENT_SPLITTER_ADDRESS en .env");
    console.log("   export PAYMENT_SPLITTER_ADDRESS=0x...");
    console.log("\nUsando modo de ejemplo...\n");
  }

  // ============================================
  // CONECTAR AL CONTRATO
  // ============================================
  
  let paymentSplitter;
  
  try {
    paymentSplitter = await ethers.getContractAt(
      "BashoodPaymentSplitter",
      PAYMENT_SPLITTER_ADDRESS
    );
    console.log(`✅ Conectado a PaymentSplitter: ${PAYMENT_SPLITTER_ADDRESS}\n`);
  } catch (error) {
    console.log("❌ Error conectando al contrato. Verifica la dirección.\n");
    process.exit(1);
  }

  // ============================================
  // INFORMACIÓN DEL CONTRATO
  // ============================================
  
  try {
    const info = await paymentSplitter.getDistributionInfo();
    const balance = await ethers.provider.getBalance(PAYMENT_SPLITTER_ADDRESS);
    const totalShares = info.shares.reduce((a, b) => a + b, 0n);

    console.log("📋 CONFIGURACIÓN DEL SPLITTER:");
    console.log("─".repeat(80));
    
    const payeeNames = ["Development", "Operations", "Marketing", "Treasury"];
    
    for (let i = 0; i < info.payees.length; i++) {
      const sharePercent = (Number(info.shares[i]) * 100 / Number(totalShares)).toFixed(2);
      console.log(`  ${i + 1}. ${payeeNames[i] || `Payee ${i + 1}`} (${sharePercent}%)`);
      console.log(`     Address: ${info.payees[i]}`);
      console.log(`     Shares:  ${info.shares[i]}`);
    }
    
    console.log("\n💰 BALANCE DEL CONTRATO:");
    console.log("─".repeat(80));
    console.log(`  Total en contrato: ${ethers.formatEther(balance)} ETH`);
    console.log(`  Total shares:      ${totalShares}`);

    // ============================================
    // FONDOS DISPONIBLES PARA CLAIM
    // ============================================
    
    console.log("\n📊 FONDOS DISPONIBLES PARA CLAIM:");
    console.log("─".repeat(80));
    
    let totalReleasable = 0n;
    
    for (let i = 0; i < info.payees.length; i++) {
      const releasable = await paymentSplitter.releasable(info.payees[i]);
      const released = info.released[i];
      const sharePercent = (Number(info.shares[i]) * 100 / Number(totalShares)).toFixed(2);
      
      totalReleasable += releasable;
      
      console.log(`\n  ${payeeNames[i] || `Payee ${i + 1}`} (${sharePercent}%):`);
      console.log(`    Disponible para claim: ${ethers.formatEther(releasable)} ETH`);
      console.log(`    Ya reclamado:          ${ethers.formatEther(released)} ETH`);
      
      if (releasable > 0) {
        console.log(`    ⚠️  Fondos pendientes de claim`);
      } else {
        console.log(`    ✅ Todo reclamado`);
      }
    }

    // ============================================
    // RESUMEN
    // ============================================
    
    console.log("\n" + "=".repeat(80));
    console.log("📈 RESUMEN:");
    console.log("─".repeat(80));
    console.log(`  Total en contrato:         ${ethers.formatEther(balance)} ETH`);
    console.log(`  Total disponible (claim):  ${ethers.formatEther(totalReleasable)} ETH`);
    console.log(`  Total ya distribuido:      ${ethers.formatEther(info.totalReleased)} ETH`);
    
    const totalProcessed = balance + info.totalReleased;
    console.log(`  Total procesado:           ${ethers.formatEther(totalProcessed)} ETH`);

    if (totalReleasable > 0) {
      console.log(`\n⚠️  HAY ${ethers.formatEther(totalReleasable)} ETH PENDIENTES DE CLAIM`);
      console.log("\n💡 Para reclamar fondos:");
      console.log("   npx hardhat run scripts/claim-payment-splitter.cjs --network <network>");
    } else {
      console.log("\n✅ Todos los fondos han sido reclamados");
    }

    // ============================================
    // DISTRIBUCIÓN POR PORCENTAJE
    // ============================================
    
    if (totalProcessed > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("📊 DISTRIBUCIÓN POR PORCENTAJE:");
      console.log("─".repeat(80));
      
      for (let i = 0; i < info.payees.length; i++) {
        const expectedAmount = totalProcessed * info.shares[i] / totalShares;
        const actualReceived = info.released[i];
        const pending = await paymentSplitter.releasable(info.payees[i]);
        const sharePercent = (Number(info.shares[i]) * 100 / Number(totalShares)).toFixed(2);
        
        console.log(`\n  ${payeeNames[i] || `Payee ${i + 1}`} (${sharePercent}%):`);
        console.log(`    Esperado total:   ${ethers.formatEther(expectedAmount)} ETH`);
        console.log(`    Ya recibido:      ${ethers.formatEther(actualReceived)} ETH`);
        console.log(`    Pendiente:        ${ethers.formatEther(pending)} ETH`);
        
        const receivedPercent = totalProcessed > 0 
          ? (Number(actualReceived) * 100 / Number(totalProcessed)).toFixed(2)
          : "0.00";
        console.log(`    % recibido real:  ${receivedPercent}%`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ MONITOREO COMPLETADO");
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Error obteniendo información del contrato:");
    console.error(error.message);
    process.exit(1);
  }
}

// ============================================
// MODO WATCH (OPCIONAL)
// ============================================

const WATCH_MODE = process.argv.includes("--watch");
const WATCH_INTERVAL = 30000; // 30 segundos

if (WATCH_MODE) {
  console.log("🔄 Modo watch activado. Actualizando cada 30 segundos...");
  console.log("   Presiona Ctrl+C para detener\n");
  
  main();
  setInterval(() => {
    console.clear();
    main();
  }, WATCH_INTERVAL);
} else {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ ERROR:", error);
      process.exit(1);
    });
}
