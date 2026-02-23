// Script SIMPLIFICADO - Deploy sin PaymentSplitter
// Solo contratos principales de Bashood
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("🚀 BASHOOD DEPLOYMENT (SIMPLIFICADO)");
  console.log("Network:", hre.network.name);
  console.log("=" .repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deploying from:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // ============================================
  // STEP 1: Deploy BashoodToken
  // ============================================
  
  console.log("=" .repeat(60));
  console.log("STEP 1: DEPLOY BASHOOD TOKEN");
  console.log("=" .repeat(60));
  
  const BashoodToken = await ethers.getContractFactory("BashoodTokenUpgradeable");
  const token = await BashoodToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  
  console.log("✅ BashoodToken deployed:", tokenAddr);
  console.log("   Total Supply: 1,000,000,000 BHT");

  // ============================================
  // RESUMEN FINAL
  // ============================================
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETADO");
  console.log("=".repeat(60));
  console.log("\n📋 Contratos desplegados:");
  console.log("  BashoodToken:", tokenAddr);
  console.log("\n✅ Deployment exitoso en red:", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });
