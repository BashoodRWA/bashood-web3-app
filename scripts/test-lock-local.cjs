/**
 * Script de test rápido para verificar lockParameters() en deployment local
 */

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n🧪 Testing lockParameters() on local deployment");
  console.log("=".repeat(60));
  
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // From deployment
  
  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);
  
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const token = BashoodToken.attach(tokenAddress);
  
  // 1. Verificar estado inicial
  console.log("\n📊 Estado ANTES de lock:");
  const initialLocked = await token.parametersLocked();
  const burnRate = await token.burnRate();
  const treasuryFee = await token.treasuryFee();
  console.log("  parametersLocked:", initialLocked);
  console.log("  burnRate:        ", burnRate.toString(), "bps");
  console.log("  treasuryFee:     ", treasuryFee.toString(), "bps");
  
  // 2. Intentar cambiar parámetro (debe funcionar)
  console.log("\n✅ Test 1: Cambiar burnRate ANTES de lock (debe funcionar)");
  try {
    const tx1 = await token.setBurnRate(50);
    await tx1.wait();
    console.log("   ✅ setBurnRate(50) exitoso");
    const newBurnRate = await token.burnRate();
    console.log("   burnRate actualizado a:", newBurnRate.toString());
  } catch (error) {
    console.log("   ❌ FALLÓ:", error.message);
  }
  
  // 3. Ejecutar lockParameters()
  console.log("\n🔒 Ejecutando lockParameters()...");
  try {
    const tx2 = await token.lockParameters();
    await tx2.wait();
    console.log("   ✅ lockParameters() exitoso");
  } catch (error) {
    console.log("   ❌ FALLÓ:", error.message);
  }
  
  // 4. Verificar que está locked
  console.log("\n📊 Estado DESPUÉS de lock:");
  const finalLocked = await token.parametersLocked();
  console.log("  parametersLocked:", finalLocked);
  
  // 5. Intentar cambiar parámetro (debe fallar)
  console.log("\n❌ Test 2: Cambiar burnRate DESPUÉS de lock (debe fallar)");
  try {
    const tx3 = await token.setBurnRate(75);
    await tx3.wait();
    console.log("   ❌ ERROR: setBurnRate NO debería haber funcionado!");
  } catch (error) {
    if (error.message.includes("ParametersAreLocked")) {
      console.log("   ✅ Correctamente rechazado: ParametersAreLocked");
    } else {
      console.log("   ⚠️  Rechazado pero con error diferente:", error.message);
    }
  }
  
  // 6. Intentar llamar lockParameters() nuevamente (debe fallar)
  console.log("\n❌ Test 3: Llamar lockParameters() otra vez (debe fallar)");
  try {
    const tx4 = await token.lockParameters();
    await tx4.wait();
    console.log("   ❌ ERROR: lockParameters NO debería poder llamarse 2 veces!");
  } catch (error) {
    if (error.message.includes("Already locked")) {
      console.log("   ✅ Correctamente rechazado: Already locked");
    } else {
      console.log("   ⚠️  Rechazado pero con error diferente:", error.message);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ lockParameters() test completado exitosamente\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
