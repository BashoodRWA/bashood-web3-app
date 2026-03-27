// Script para deploy del PaymentSplitter de Bashood
// Uso: npx hardhat run scripts/deploy-payment-splitter.js --network base-sepolia

import hre from "hardhat";
const ethers = hre.ethers;

async function main() {
  console.log("🚀 DEPLOYING BASHOOD PAYMENT SPLITTER");
  console.log("Network:", hre.network.name);
  console.log("=" .repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deploying from:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // ============================================
  // CONFIGURACIÓN DE WALLETS
  // ============================================
  
  // TODO: Reemplazar con las addresses reales de las 4 wallets multi-sig
  // Estas son addresses de ejemplo - CAMBIAR antes de mainnet
  
  const WALLETS = {
    development: process.env.DEVELOPMENT_WALLET || deployer.address,  // 45%
    operations: process.env.OPERATIONS_WALLET || deployer.address,   // 25%
    marketing: process.env.MARKETING_WALLET || deployer.address,     // 20%
    treasury: process.env.TREASURY_WALLET || deployer.address        // 10%
  };

  console.log("\n🏦 Wallet Configuration:");
  console.log("  Development (45%):", WALLETS.development);
  console.log("  Operations  (25%):", WALLETS.operations);
  console.log("  Marketing   (20%):", WALLETS.marketing);
  console.log("  Treasury    (10%):", WALLETS.treasury);

  // Validación de wallets
  if (hre.network.name === "base-mainnet") {
    // En mainnet, asegurar que no se usen wallets temporales
    const allSame = Object.values(WALLETS).every(addr => addr === deployer.address);
    if (allSame) {
      throw new Error("❌ MAINNET REQUIRES SEPARATE WALLETS! Set environment variables.");
    }
  }

  // ============================================
  // DEPLOY PAYMENT SPLITTER
  // ============================================
  
  console.log("\n📦 Deploying BashoodPaymentSplitter...");
  
  const BashoodPaymentSplitter = await ethers.getContractFactory("BashoodPaymentSplitter");

  const payees = [
    WALLETS.development,
    WALLETS.operations,
    WALLETS.marketing,
    WALLETS.treasury
  ];
  const shares = [45, 25, 20, 10];

  const splitter = await BashoodPaymentSplitter.deploy(payees, shares);
  
  await splitter.waitForDeployment();
  const splitterAddress = await splitter.getAddress();
  
  console.log("✅ PaymentSplitter deployed to:", splitterAddress);

  // ============================================
  // VERIFICACIÓN
  // ============================================
  
  console.log("\n🔍 Verifying configuration...");
  
  const distributionInfo = await splitter.getDistributionInfo();
  const [distWallets, distPercentages, distPending, distReleased] = distributionInfo;

  console.log("\n📊 Distribution Summary:");
  const walletNames = ["Development", "Operations", "Marketing", "Treasury"];
  for (let i = 0; i < distWallets.length; i++) {
    console.log(`  ${walletNames[i]}:`);
    console.log(`    Address: ${distWallets[i]}`);
    console.log(`    Share: ${distPercentages[i]}%`);
    console.log(`    Pending: ${ethers.formatEther(distPending[i])} ETH`);
    console.log(`    Released: ${ethers.formatEther(distReleased[i])} ETH`);
  }

  // ============================================
  // TEST (solo en testnet)
  // ============================================
  
  if (hre.network.name !== "base-mainnet") {
    console.log("\n🧪 Testing with 1 ETH...");
    
    const testAmount = ethers.parseEther("1.0");
    const tx = await deployer.sendTransaction({
      to: splitterAddress,
      value: testAmount
    });
    await tx.wait();
    
    console.log("✅ Sent 1 ETH to PaymentSplitter");
    
    // Verificar distribución
    const updatedInfo = await splitter.getDistributionInfo();
    const [updWallets, , updPending] = updatedInfo;
    console.log("\n📈 Expected distribution of 1 ETH:");
    console.log("  Development: 0.45 ETH (45%)");
    console.log("  Operations:  0.25 ETH (25%)");
    console.log("  Marketing:   0.20 ETH (20%)");
    console.log("  Treasury:    0.10 ETH (10%)");
    
    console.log("\n💰 Actual pending amounts:");
    const wnames = ["Development", "Operations", "Marketing", "Treasury"];
    for (let i = 0; i < updWallets.length; i++) {
      console.log(`  ${wnames[i]}: ${ethers.formatEther(updPending[i])} ETH`);
    }
  }

  // ============================================
  // DEPLOYMENT SUMMARY
  // ============================================
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nContract Address:", splitterAddress);
  console.log("\nNext Steps:");
  console.log("1. ✅ Save this address for BashoodPresaleFinal deployment");
  console.log("2. ✅ Use this address as 'projectWallet' parameter");
  console.log("3. ✅ Verify contract on Basescan (mainnet only)");
  console.log("4. ✅ Test release functions on testnet");
  console.log("\nConfiguration File:");
  console.log(`{
  "network": "${hre.network.name}",
  "paymentSplitter": "${splitterAddress}",
  "wallets": {
    "development": "${WALLETS.development}",
    "operations": "${WALLETS.operations}",
    "marketing": "${WALLETS.marketing}",
    "treasury": "${WALLETS.treasury}"
  },
  "distribution": {
    "development": "45%",
    "operations": "25%",
    "marketing": "20%",
    "treasury": "10%"
  }
}`);

  // Guardar deployment info
  const { default: fs } = await import("fs");
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    paymentSplitter: splitterAddress,
    wallets: WALLETS,
    distribution: {
      development: "45%",
      operations: "25%",
      marketing: "20%",
      treasury: "10%"
    }
  };
  
  const filename = `deployments/payment-splitter-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);

  console.log("\n✅ DEPLOYMENT COMPLETE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
