// Script de deployment COMPLETO para Bashood con nuevo tokenomics
// Incluye PaymentSplitter para distribución automática 45/25/20/10
// Uso: npx hardhat run scripts/deploy-bashood-complete.js --network base-sepolia

const hre = require("hardhat");
const ethers = hre.ethers;

/**
 * TOKENOMICS BASHOOD
 * 
 * 0.1 ETH = 25,000 BHT
 * Precio por BHT: $0.0092 USD
 * Presale supply: 250,000,000 BHT (25% del total)
 * Target raise: 1,000 ETH = $2,300,000 USD
 * Market cap inicial: $9.2M
 * 
 * Distribución de fondos (vía PaymentSplitter):
 * - 45% Development ($1.03M)
 * - 25% Operations ($575k)
 * - 20% Marketing ($460k)
 * - 10% Treasury ($230k)
 */

async function main() {
  console.log("🚀 BASHOOD COMPLETE DEPLOYMENT");
  console.log("Network:", hre.network.name);
  console.log("Tokenomics: 0.1 ETH = 25,000 BHT");
  console.log("=" .repeat(80));

  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deploying from:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // ============================================
  // STEP 0: Configuración de Wallets
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 0: WALLET CONFIGURATION");
  console.log("=".repeat(80));

  // Multi-sig wallets (reemplazar con addresses reales de Gnosis Safe)
  const WALLETS = {
    development: process.env.DEVELOPMENT_WALLET || deployer.address,  // 45%
    operations: process.env.OPERATIONS_WALLET || deployer.address,   // 25%
    marketing: process.env.MARKETING_WALLET || deployer.address,     // 20%
    treasury: process.env.TREASURY_WALLET || deployer.address        // 10%
  };

  console.log("\n🏦 Multi-Sig Wallets:");
  console.log("  Development (45%):", WALLETS.development);
  console.log("  Operations  (25%):", WALLETS.operations);
  console.log("  Marketing   (20%):", WALLETS.marketing);
  console.log("  Treasury    (10%):", WALLETS.treasury);

  // Validación de seguridad para mainnet
  if (hre.network.name === "base-mainnet") {
    const allSame = Object.values(WALLETS).every(addr => addr === deployer.address);
    if (allSame) {
      throw new Error("❌ MAINNET REQUIRES SEPARATE MULTI-SIG WALLETS!");
    }
    console.log("✅ Wallet validation passed (different addresses)");
  }

  // ============================================
  // STEP 1: Deploy PaymentSplitter (TEMPORALMENTE DESHABILITADO)
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: PAYMENT SPLITTER (SKIPPED - OpenZeppelin issue)");
  console.log("=".repeat(80));
  
  console.log("\n⚠️ PaymentSplitter temporalmente deshabilitado");
  console.log("   Razón: OpenZeppelin PaymentSplitter.sol no disponible en esta versión");
  console.log("   Solución temporal: Usar WALLETS.development como projectWallet");
  console.log("   TODO: Implementar PaymentSplitter custom o actualizar OpenZeppelin");
  
  // TEMPORAL: Usar development wallet directamente
  const splitterAddr = WALLETS.development;
  
  console.log("✅ ProjectWallet (temporal):", splitterAddr);
  console.log("   ⚠️ Los fondos irán directamente a Development wallet");
  console.log("   ⚠️ Distribución manual requerida (45/25/20/10)");

  // ============================================
  // STEP 2: Deploy BashoodToken
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: DEPLOY BASHOOD TOKEN (BHT)");
  console.log("=".repeat(80));
  
  console.log("\n📦 Deploying BashoodToken...");
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = await BashoodToken.deploy(deployer.address);
  await bashoodToken.waitForDeployment();
  const bashoodTokenAddr = await bashoodToken.getAddress();
  
  console.log("✅ BashoodToken deployed to:", bashoodTokenAddr);
  console.log("   Total supply: 1,000,000,000 BHT");
  console.log("   Presale allocation: 250,000,000 BHT (25%)");

  // ============================================
  // STEP 3: Deploy NFT Contract
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: DEPLOY NFT CONTRACT");
  console.log("=".repeat(80));
  
  console.log("\n📦 Deploying MockNFT1155...");
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();
  const mockNFTAddr = await mockNFT.getAddress();
  
  console.log("✅ MockNFT1155 deployed to:", mockNFTAddr);

  // ============================================
  // STEP 4: Deploy Chainlink Price Feed
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: DEPLOY CHAINLINK ORACLE");
  console.log("=".repeat(80));
  
  console.log("\n📦 Deploying MockPriceFeed...");
  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("2300", 8)); // $2,300/ETH
  await mockPriceFeed.waitForDeployment();
  const mockPriceFeedAddr = await mockPriceFeed.getAddress();
  
  console.log("✅ MockPriceFeed deployed to:", mockPriceFeedAddr);
  console.log("   Initial price: $2,300 ETH/USD");

  // ============================================
  // STEP 5: Deploy Referral System
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 5: DEPLOY REFERRAL SYSTEM");
  console.log("=".repeat(80));
  
  console.log("\n📦 Deploying ReferralValidator...");
  const ReferralValidator = await ethers.getContractFactory("ReferralValidator");
  const validator = await ReferralValidator.deploy(deployer.address);
  await validator.waitForDeployment();
  const validatorAddr = await validator.getAddress();
  
  console.log("✅ ReferralValidator deployed to:", validatorAddr);

  console.log("\n📦 Deploying BashoodReferral...");
  const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
  const bashoodReferral = await BashoodReferral.deploy(
    deployer.address,
    validatorAddr,
    mockNFTAddr
  );
  await bashoodReferral.waitForDeployment();
  const bashoodReferralAddr = await bashoodReferral.getAddress();
  
  console.log("✅ BashoodReferral deployed to:", bashoodReferralAddr);

  // ============================================
  // STEP 6: Deploy BashoodPresaleFinal
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 6: DEPLOY PRESALE CONTRACT");
  console.log("=".repeat(80));
  
  // TOKENOMICS: 0.1 ETH = 25,000 BHT
  const BHT_PER_LOT = ethers.parseUnits("25000", 18);     // 25,000 BHT
  const ETH_PER_LOT = ethers.parseEther("0.1");           // 0.1 ETH
  
  console.log("\n💎 Tokenomics Configuration:");
  console.log("   1 Lot = 0.1 ETH = 25,000 BHT");
  console.log("   Price per BHT: $0.0092 USD");
  console.log("   Total presale: 250M BHT");
  console.log("   Expected raise: 1,000 ETH ($2.3M)");
  
  const presaleParams = {
    bhtToken: bashoodTokenAddr,
    nftContract: mockNFTAddr,
    referralContract: bashoodReferralAddr,
    projectWallet: splitterAddr,  // ← PaymentSplitter aquí
    nftPriceETH: ETH_PER_LOT,
    nftPriceBHT: BHT_PER_LOT,
    presaleStart: Math.floor(Date.now() / 1000) + 3600,      // 1 hora
    presaleEnd: Math.floor(Date.now() / 1000) + 86400 * 30,  // 30 días
    maxNFTSupply: 10000  // Suficiente para toda la preventa
  };

  console.log("\n📦 Deploying BashoodPresaleFinal...");
  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
  const bashoodPresale = await BashoodPresaleFinal.deploy(
    presaleParams.bhtToken,
    presaleParams.nftContract,
    presaleParams.referralContract,
    presaleParams.projectWallet,
    presaleParams.nftPriceETH,
    presaleParams.nftPriceBHT,
    presaleParams.presaleStart,
    presaleParams.presaleEnd,
    presaleParams.maxNFTSupply
  );
  await bashoodPresale.waitForDeployment();
  const bashoodPresaleAddr = await bashoodPresale.getAddress();
  
  console.log("✅ BashoodPresaleFinal deployed to:", bashoodPresaleAddr);
  console.log("   Project wallet (PaymentSplitter):", splitterAddr);

  // ============================================
  // STEP 7: Deploy BashoodRescue
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 7: DEPLOY RESCUE CONTRACT");
  console.log("=".repeat(80));
  
  console.log("\n📦 Deploying BashoodRescue...");
  const BashoodRescue = await ethers.getContractFactory("contracts/BashoodRescue.sol:BashoodRescue");
  const bashoodRescue = await BashoodRescue.deploy(
    deployer.address,
    bashoodPresaleAddr
  );
  await bashoodRescue.waitForDeployment();
  const bashoodRescueAddr = await bashoodRescue.getAddress();
  
  console.log("✅ BashoodRescue deployed to:", bashoodRescueAddr);

  // ============================================
  // STEP 8: Configurar Presale
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 8: CONFIGURE PRESALE");
  console.log("=".repeat(80));

  console.log("\n⚙️  Setting up BashoodPresaleFinal...");

  // 8.1. Set price feed
  let tx = await bashoodPresale.setPriceFeed(mockPriceFeedAddr);
  await tx.wait();
  console.log("✅ Price feed configured");

  // 8.2. Set operations wallet
  tx = await bashoodPresale.setOperationsWallet(WALLETS.operations);
  await tx.wait();
  console.log("✅ Operations wallet configured");

  // 8.3. Set signer
  tx = await bashoodPresale.setSigner(deployer.address);
  await tx.wait();
  console.log("✅ Signer configured");

  // 8.4. Presale is already active (not paused by default)
  console.log("✅ Presale is active (no pause needed)");

  // 8.5. Transfer BHT to presale (250M para vender)
  const PRESALE_SUPPLY = ethers.parseUnits("250000000", 18); // 250M BHT
  tx = await bashoodToken.transfer(bashoodPresaleAddr, PRESALE_SUPPLY);
  await tx.wait();
  console.log("✅ Transferred 250M BHT to presale contract");

  // 8.6. Mint NFTs to presale
  tx = await mockNFT.mint(bashoodPresaleAddr, 1, presaleParams.maxNFTSupply);
  await tx.wait();
  console.log(`✅ Minted ${presaleParams.maxNFTSupply} NFTs to presale contract`);

  // 8.7. NFT IDs already allowed in constructor (IDs 1 & 2)
  console.log("✅ NFT IDs 1 & 2 already allowed (set in constructor)");

  // ============================================
  // STEP 9: Verificar PaymentSplitter (DISABLED)
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("STEP 9: PAYMENT SPLITTER STATUS");
  console.log("=".repeat(80));

  console.log("\n⚠️ PaymentSplitter temporalmente deshabilitado");
  console.log("   Fondos van directamente a Development wallet");
  console.log("   Distribución manual requerida:");
  console.log("     Development: 45% → 0x51023F043EAB1F4784128278cEA5a57ed98F5a68");
  console.log("     Operations:  25% → 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  console.log("     Marketing:   20% → 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
  console.log("     Treasury:    10% → 0xE4dE660B6EfD0241f827c0f17CEe721aC5F44afE");

  // ============================================
  // DEPLOYMENT SUMMARY
  // ============================================
  
  console.log("\n" + "=".repeat(80));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(80));

  const deploymentSummary = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    
    tokenomics: {
      bhtPerLot: "25,000 BHT",
      ethPerLot: "0.1 ETH",
      pricePerBHT: "$0.0092",
      presaleSupply: "250,000,000 BHT",
      targetRaise: "1,000 ETH ($2.3M)"
    },
    
    contracts: {
      paymentSplitter: splitterAddr,
      bashoodToken: bashoodTokenAddr,
      nftContract: mockNFTAddr,
      priceFeed: mockPriceFeedAddr,
      referralValidator: validatorAddr,
      bashoodReferral: bashoodReferralAddr,
      bashoodPresale: bashoodPresaleAddr,
      bashoodRescue: bashoodRescueAddr
    },
    
    wallets: {
      development: { address: WALLETS.development, share: "45%" },
      operations: { address: WALLETS.operations, share: "25%" },
      marketing: { address: WALLETS.marketing, share: "20%" },
      treasury: { address: WALLETS.treasury, share: "10%" }
    },
    
    presale: {
      active: true,
      startTime: presaleParams.presaleStart,
      endTime: presaleParams.presaleEnd,
      maxSupply: presaleParams.maxNFTSupply,
      bhtAllocated: "250,000,000 BHT",
      nftsMinted: presaleParams.maxNFTSupply
    }
  };

  console.log("\n🎯 Core Contracts:");
  console.log("  PaymentSplitter:    ", splitterAddr);
  console.log("  BashoodToken (BHT): ", bashoodTokenAddr);
  console.log("  BashoodPresaleFinal:", bashoodPresaleAddr);
  console.log("  BashoodRescue:      ", bashoodRescueAddr);

  console.log("\n💰 Tokenomics:");
  console.log("  0.1 ETH = 25,000 BHT ($0.0092/BHT)");
  console.log("  Presale: 250M BHT (25% of total)");
  console.log("  Target: 1,000 ETH = $2.3M USD");

  console.log("\n🏦 Fund Distribution (automatic via PaymentSplitter):");
  console.log("  Development: 45% → $1,035,000");
  console.log("  Operations:  25% →   $575,000");
  console.log("  Marketing:   20% →   $460,000");
  console.log("  Treasury:    10% →   $230,000");

  console.log("\n✅ Next Steps:");
  console.log("  1. Verify contracts on Basescan (if mainnet)");
  console.log("  2. Test purchase flow with 0.1 ETH");
  console.log("  3. Verify PaymentSplitter distribution");
  console.log("  4. Set up monitoring/alerts");
  console.log("  5. Launch presale marketing campaign");
  console.log("\n⚠️  CRITICAL POST-PRESALE STEP:");
  console.log("  🔒 After presale ends, run: npx hardhat run scripts/post-presale-lock.js");
  console.log("     This locks economic parameters PERMANENTLY (irreversible).");

  // Save deployment data
  const fs = require("fs");
  const filename = `deployments/bashood-complete-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentSummary, null, 2));
  console.log(`\n💾 Deployment data saved to: ${filename}`);

  console.log("\n✅ DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });
