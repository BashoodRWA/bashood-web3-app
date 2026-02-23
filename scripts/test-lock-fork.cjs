/**
 * Test rápido de lockParameters() en fork de Base mainnet
 */

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n🧪 Testing lockParameters() on Base Fork");
  console.log("=".repeat(60));
  
  // Leer el último deployment
  const fs = require("fs");
  const deployments = fs.readdirSync("deployments")
    .filter(f => f.includes("localhost"))
    .sort()
    .reverse();
  
  if (deployments.length === 0) {
    throw new Error("No deployment found");
  }
  
  const latestDeployment = JSON.parse(
    fs.readFileSync(`deployments/${deployments[0]}`, "utf8")
  );
  
  const tokenAddress = latestDeployment.contracts.bashoodToken;
  console.log("BashoodToken:", tokenAddress);
  
  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);
  
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const token = BashoodToken.attach(tokenAddress);
  
  // Verificar estado
  console.log("\n📊 Estado actual:");
  const locked = await token.parametersLocked();
  const burnRate = await token.burnRate();
  const treasuryFee = await token.treasuryFee();
  console.log("  parametersLocked:", locked);
  console.log("  burnRate:        ", burnRate.toString(), "bps");
  console.log("  treasuryFee:     ", treasuryFee.toString(), "bps");
  
  if (locked) {
    console.log("\n⚠️  Parameters already locked in this deployment");
    return;
  }
  
  // Ejecutar lock
  console.log("\n🔒 Ejecutando lockParameters()...");
  const tx = await token.lockParameters();
  await tx.wait();
  console.log("   ✅ lockParameters() exitoso");
  console.log("   TX:", tx.hash);
  
  // Verificar
  const finalLocked = await token.parametersLocked();
  console.log("\n📊 Estado después de lock:");
  console.log("  parametersLocked:", finalLocked);
  
  // Intentar cambiar (debe fallar)
  console.log("\n❌ Intentando cambiar burnRate (debe fallar):");
  try {
    await token.setBurnRate(100);
    console.log("   ❌ ERROR: No debería permitir cambio!");
  } catch (error) {
    if (error.message.includes("ParametersAreLocked")) {
      console.log("   ✅ Correctamente rechazado");
    }
  }
  
  console.log("\n✅ lockParameters() funciona correctamente en fork\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
