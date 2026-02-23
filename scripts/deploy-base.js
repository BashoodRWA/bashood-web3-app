// Script de deployment para Base Network
// Uso: npx hardhat run scripts/deploy-base.js --network base-sepolia (testnet)
//      npx hardhat run scripts/deploy-base.js --network base-mainnet (producción)

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("🚀 INICIANDO DEPLOYMENT A BASE NETWORK");
  console.log("Network:", hre.network.name);

  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deploying account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // ============================================
  // 1. Deploy BashoodToken
  // ============================================
  console.log("\n📦 Deploying BashoodToken...");
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = await BashoodToken.deploy(deployer.address);
  await bashoodToken.waitForDeployment();
  const bashoodTokenAddr = await bashoodToken.getAddress();
  console.log("✅ BashoodToken deployed to:", bashoodTokenAddr);

  // ============================================
  // 2. Deploy Mock NFT (for presale)
  // ============================================
  console.log("\n📦 Deploying MockNFT1155...");
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();
  const mockNFTAddr = await mockNFT.getAddress();
  console.log("✅ MockNFT1155 deployed to:", mockNFTAddr);

  // ============================================
  // 3. Deploy Mock Price Feed (Chainlink Oracle)
  // ============================================
  console.log("\n📦 Deploying MockPriceFeed (Chainlink Oracle)...");
  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  // Initialize with 8 decimals, $100 price
  const mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("100", 8));
  await mockPriceFeed.waitForDeployment();
  const mockPriceFeedAddr = await mockPriceFeed.getAddress();
  console.log("✅ MockPriceFeed deployed to:", mockPriceFeedAddr);

  // ============================================
  // 4. Deploy BashoodReferral
  // ============================================
  console.log("\n📦 Deploying BashoodReferral...");
  
  // First deploy validator
  const ReferralValidator = await ethers.getContractFactory("ReferralValidator");
  const validator = await ReferralValidator.deploy(deployer.address);
  await validator.waitForDeployment();
  const validatorAddr = await validator.getAddress();
  console.log("✅ ReferralValidator deployed to:", validatorAddr);

  const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
  const bashoodReferral = await BashoodReferral.deploy(
    deployer.address,        // presale (will be set later)
    validatorAddr,           // validator
    mockNFTAddr              // nftContract
  );
  await bashoodReferral.waitForDeployment();
  const bashoodReferralAddr = await bashoodReferral.getAddress();
  console.log("✅ BashoodReferral deployed to:", bashoodReferralAddr);

  // ============================================
  // 5. Deploy BashoodPresaleFinal
  // ============================================
  console.log("\n📦 Deploying BashoodPresaleFinal...");
  
  // Presale parameters
  const presaleParams = {
    bhtToken: bashoodTokenAddr,
    nftContract: mockNFTAddr,
    referralContract: bashoodReferralAddr,
    projectWallet: deployer.address,
    nftPriceETH: ethers.parseEther("0.1"),      // 0.1 ETH
    nftPriceBHT: ethers.parseUnits("100", 18),  // 100 BHT
    presaleStart: Math.floor(Date.now() / 1000) + 3600,  // 1 hour from now
    presaleEnd: Math.floor(Date.now() / 1000) + 86400 * 30,  // 30 days from now
    maxNFTSupply: 1000
  };

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

  // ============================================
  // 6. Deploy BashoodRescue
  // ============================================
  console.log("\n📦 Deploying BashoodRescue...");
  const BashoodRescue = await ethers.getContractFactory("contracts/BashoodRescue.sol:BashoodRescue");
  const bashoodRescue = await BashoodRescue.deploy(
    deployer.address,        // owner
    bashoodPresaleAddr       // presale
  );
  await bashoodRescue.waitForDeployment();
  const bashoodRescueAddr = await bashoodRescue.getAddress();
  console.log("✅ BashoodRescue deployed to:", bashoodRescueAddr);

  // ============================================
  // 7. Configure Presale
  // ============================================
  console.log("\n⚙️  Configurando BashoodPresaleFinal...");

  // Set oracle price feed
  let tx = await bashoodPresale.setPriceFeed(mockPriceFeedAddr);
  await tx.wait();
  console.log("✅ Price feed configurado");

  // Set operations wallet
  tx = await bashoodPresale.setOperationsWallet(deployer.address);
  await tx.wait();
  console.log("✅ Operations wallet configurado");

  // Set rescue contract
  tx = await bashoodPresale.setRescueContract(bashoodRescueAddr);
  await tx.wait();
  console.log("✅ Rescue contract configurado");

  // Set max price staleness (24 hours)
  tx = await bashoodPresale.setMaxPriceStaleness(86400);
  await tx.wait();
  console.log("✅ Max price staleness configurado");

  // Grant ADMIN_ROLE to deployer
  const ADMIN_ROLE = await bashoodPresale.ADMIN_ROLE();
  tx = await bashoodPresale.grantRole(ADMIN_ROLE, deployer.address);
  await tx.wait();
  console.log("✅ ADMIN_ROLE asignado");

  // Mint some NFTs to presale contract
  tx = await mockNFT.mint(bashoodPresaleAddr, 1, 100, "0x");
  await tx.wait();
  console.log("✅ NFTs minteados para presale");

  // ============================================
  // 8. Resumen de Deployment
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETADO EN BASE");
  console.log("=".repeat(60));
  console.log("\n📋 DIRECCIONES DESPLEGADAS:\n");
  console.log("BashoodToken:       ", bashoodTokenAddr);
  console.log("MockNFT1155:        ", mockNFTAddr);
  console.log("MockPriceFeed:      ", mockPriceFeedAddr);
  console.log("ReferralValidator:  ", validatorAddr);
  console.log("BashoodReferral:    ", bashoodReferralAddr);
  console.log("BashoodPresale:     ", bashoodPresaleAddr);
  console.log("BashoodRescue:      ", bashoodRescueAddr);
  console.log("\n" + "=".repeat(60));
  console.log("🔍 Para verificar contratos en Basescan:");
  console.log("npx hardhat verify --network", hre.network.name, "CONTRACT_ADDRESS [args...]");
  console.log("=".repeat(60) + "\n");

  console.log("✅ Next Steps:");
  console.log("  1. Verify contracts on Basescan (if mainnet)");
  console.log("  2. Test purchase flow with 0.1 ETH");
  console.log("  3. Launch presale marketing campaign");
  console.log("\n⚠️  CRITICAL POST-PRESALE STEP:");
  console.log("  🔒 After presale ends, run: npx hardhat run scripts/post-presale-lock.js");
  console.log("     This locks economic parameters PERMANENTLY (irreversible).\n");

  // Save deployment info to file
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      bashoodToken: bashoodTokenAddr,
      mockNFT: mockNFTAddr,
      mockPriceFeed: mockPriceFeedAddr,
      referralValidator: validatorAddr,
      bashoodReferral: bashoodReferralAddr,
      bashoodPresale: bashoodPresaleAddr,
      bashoodRescue: bashoodRescueAddr
    }
  };

  const fs = require("fs");
  const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info guardado en: ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
