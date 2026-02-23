const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("💰 CLAIM: BashoodPaymentSplitter");
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
  console.log(`  Signer: ${signer.address}`);
  console.log(`  PaymentSplitter: ${PAYMENT_SPLITTER_ADDRESS}\n`);

  const paymentSplitter = await ethers.getContractAt(
    "BashoodPaymentSplitter",
    PAYMENT_SPLITTER_ADDRESS
  );

  // ============================================
  // VERIFICAR FONDOS DISPONIBLES
  // ============================================
  
  console.log("🔍 Verificando fondos disponibles...\n");
  
  const releasable = await paymentSplitter.releasable(signer.address);
  const balance = await ethers.provider.getBalance(PAYMENT_SPLITTER_ADDRESS);
  
  console.log(`💰 Balance del contrato: ${ethers.formatEther(balance)} ETH`);
  console.log(`💸 Disponible para ti:   ${ethers.formatEther(releasable)} ETH\n`);

  if (releasable === 0n) {
    console.log("⚠️  No hay fondos disponibles para reclamar");
    console.log("   Opciones:");
    console.log("   1. Ya reclamaste todo lo disponible");
    console.log("   2. No eres un payee del contrato");
    console.log("   3. El contrato no ha recibido fondos aún\n");
    process.exit(0);
  }

  // ============================================
  // CONFIRMAR CLAIM
  // ============================================
  
  console.log("─".repeat(80));
  console.log(`⚠️  CONFIRMACIÓN:`);
  console.log(`   Vas a reclamar: ${ethers.formatEther(releasable)} ETH`);
  console.log(`   A la wallet:    ${signer.address}`);
  console.log("─".repeat(80));

  // Si estás en producción, puedes agregar un prompt de confirmación aquí
  // Para automatización, continúa directamente

  // ============================================
  // EJECUTAR CLAIM
  // ============================================
  
  console.log(`\n💸 Reclamando fondos...`);
  
  try {
    const balanceBefore = await ethers.provider.getBalance(signer.address);
    
    const tx = await paymentSplitter.release(signer.address);
    console.log(`   Tx hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmado en bloque ${receipt.blockNumber}`);
    
    const balanceAfter = await ethers.provider.getBalance(signer.address);
    const received = balanceAfter - balanceBefore;
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const netReceived = received + gasCost;
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ETH recibido:  ${ethers.formatEther(netReceived)} ETH`);
    console.log(`   Gas pagado:    ${ethers.formatEther(gasCost)} ETH`);
    console.log(`   Neto:          ${ethers.formatEther(received)} ETH`);
    
    console.log("\n✅ Fondos reclamados exitosamente\n");
    
  } catch (error) {
    console.error("\n❌ Error al reclamar fondos:");
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
