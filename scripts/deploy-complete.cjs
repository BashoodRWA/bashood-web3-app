/**
 * BASHOOD Complete Deployment Script
 * Testnet (mock data) y Mainnet (datos reales)
 * 
 * Network detection automático
 * Deployer: Debe tener suficiente ETH
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURACIÓN MOCK (Base Sepolia Testnet)
// ============================================================================
const MOCK_CONFIG = {
  // Token - Usar del .env si existe
  treasury: process.env.TREASURY_WALLET || "0x0000000000000000000000000000000000000001",
  
  // Presale Timing (30 días desde ahora)
  presaleStart: Math.floor(Date.now() / 1000) + 3600, // +1h
  presaleEnd: Math.floor(Date.now() / 1000) + (30 * 24 * 3600), // +30 días
  
  // NFT Pricing (mock)
  nftPrices: [
    hre.ethers.parseEther("0.01"), // NFT ID 1 (VULCAN mock)
    hre.ethers.parseEther("0.02"), // NFT ID 2 (EVOBLOCK mock)
    hre.ethers.parseEther("0.03")  // NFT ID 3 (PREMIUM mock)
  ],
  
  // NFT Supply
  maxSupply: [500, 300, 200], // Total 1000 NFTs
  
  // Payment Split Wallets - Usar del .env si existen
  developmentWallet: process.env.DEVELOPMENT_WALLET || "0x0000000000000000000000000000000000000002",
  operationsWallet: process.env.OPERATIONS_WALLET || "0x0000000000000000000000000000000000000003",
  marketingWallet: process.env.MARKETING_WALLET || "0x0000000000000000000000000000000000000004",
  treasuryPSWallet: process.env.TREASURY_PS_WALLET || "0x0000000000000000000000000000000000000005",
  
  // Payment Split Percentages (45%, 25%, 20%, 10%)
  shares: [4500, 2500, 2000, 1000],
  
  // Rescue - Usar deployer como default
  adminWallet: process.env.ADMIN_WALLET || process.env.DEVELOPMENT_WALLET || "0x0000000000000000000000000000000000000006",
  emergencyWallet: process.env.EMERGENCY_WALLET || process.env.DEVELOPMENT_WALLET || "0x0000000000000000000000000000000000000007",
  
  // Referral
  maxCommissionBps: 500, // 5%
  
  // Presale
  maxNFTsPerUser: 10,
  maxNFTsPerTx: 5,
  
  // Chainlink (Base Sepolia - si existe, sino usar mock)
  // TODO: Verificar address real de ETH/USD en Base Sepolia
  priceFeed: "0x0000000000000000000000000000000000000000" // Mock address
};

// ============================================================================
// CONFIGURACIÓN MAINNET (Datos reales de EVOCONS)
// ============================================================================
const MAINNET_CONFIG = {
  // TODO: Completar después de llamada EVOCONS
  treasury: process.env.TREASURY_WALLET || "",
  presaleStart: 0, // Configurar fecha real
  presaleEnd: 0,
  nftPrices: [], // Precios reales VULCAN/EVOBLOCK
  maxSupply: [],
  developmentWallet: process.env.DEVELOPMENT_WALLET || "",
  operationsWallet: process.env.OPERATIONS_WALLET || "",
  marketingWallet: process.env.MARKETING_WALLET || "",
  treasuryPSWallet: process.env.TREASURY_PS_WALLET || "",
  shares: [4500, 2500, 2000, 1000],
  adminWallet: process.env.ADMIN_WALLET || "",
  emergencyWallet: process.env.EMERGENCY_WALLET || "",
  maxCommissionBps: 500,
  maxNFTsPerUser: 10,
  maxNFTsPerTx: 5,
  priceFeed: "0x0000000000000000000000000000000000000000" // TODO: Chainlink real
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getConfig(network) {
  if (network === "baseSepolia" || network === "base-sepolia" || network === "hardhat" || network === "localhost") {
    console.log(network === "hardhat" || network === "localhost" 
      ? "🧪 Usando configuración MOCK para red LOCAL" 
      : "🧪 Usando configuración MOCK para testnet");
    return MOCK_CONFIG;
  } else if (network === "base" || network === "baseMainnet") {
    console.log("🚀 Usando configuración REAL para mainnet");
    return MAINNET_CONFIG;
  } else {
    throw new Error(`Network no soportado: ${network}`);
  }
}

function validateConfig(config, network) {
  const errors = [];
  
  // Validar wallets no sean address(0)
  if (network === "base" || network === "baseMainnet") {
    if (!config.treasury || config.treasury === "") errors.push("TREASURY_WALLET no configurado");
    if (!config.developmentWallet || config.developmentWallet === "") errors.push("DEVELOPMENT_WALLET no configurado");
    if (!config.operationsWallet || config.operationsWallet === "") errors.push("OPERATIONS_WALLET no configurado");
    if (!config.marketingWallet || config.marketingWallet === "") errors.push("MARKETING_WALLET no configurado");
    if (!config.treasuryPSWallet || config.treasuryPSWallet === "") errors.push("TREASURY_PS_WALLET no configurado");
  }
  
  // Validar wallets sean diferentes
  const wallets = [
    config.developmentWallet,
    config.operationsWallet,
    config.marketingWallet,
    config.treasuryPSWallet
  ];
  const uniqueWallets = new Set(wallets);
  if (uniqueWallets.size !== wallets.length) {
    errors.push("Error: Las 4 wallets del PaymentSplitter deben ser diferentes");
  }
  
  // Validar shares sumen 10000 (100%)
  const totalShares = config.shares.reduce((a, b) => a + b, 0);
  if (totalShares !== 10000) {
    errors.push(`Shares deben sumar 10000, actualmente: ${totalShares}`);
  }
  
  // Validar fechas
  if (config.presaleStart >= config.presaleEnd) {
    errors.push("presaleStart debe ser antes que presaleEnd");
  }
  
  // Validar precios
  if (config.nftPrices.length === 0) {
    errors.push("nftPrices vacío");
  }
  
  return errors;
}

function saveDeployment(network, addresses) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `deployments/${network}-${timestamp}.json`;
  
  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments");
  }
  
  const data = {
    network,
    timestamp: new Date().toISOString(),
    addresses,
    chainId: hre.network.config.chainId
  };
  
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`\n📄 Deployment guardado en: ${filename}`);
  
  return filename;
}

function printVerificationCommands(network, addresses, constructorArgs) {
  console.log("\n" + "=".repeat(80));
  console.log("📋 COMANDOS DE VERIFICACIÓN (Basescan)");
  console.log("=".repeat(80));
  
  const networkFlag = network === "baseSepolia" ? "baseSepolia" : "base";
  
  console.log(`\n# BashoodToken`);
  console.log(`npx hardhat verify --network ${networkFlag} ${addresses.token} "${constructorArgs.token[0]}"`);
  
  console.log(`\n# MockNFT1155`);
  console.log(`npx hardhat verify --network ${networkFlag} ${addresses.nft}`);
  
  console.log(`\n# BashoodReferral`);
  console.log(`npx hardhat verify --network ${networkFlag} ${addresses.referral} ${constructorArgs.referral.join(" ")}`);
  
  console.log(`\n# BashoodPaymentSplitter`);
  const wallets = constructorArgs.splitter[0].map(w => `"${w}"`).join(" ");
  const shares = constructorArgs.splitter[1].join(" ");
  console.log(`npx hardhat verify --network ${networkFlag} ${addresses.splitter} "[${wallets}]" "[${shares}]"`);
  
  console.log(`\n# BashoodRescue`);
  console.log(`npx hardhat verify --network ${networkFlag} ${addresses.rescue} "${constructorArgs.rescue[0]}" "${constructorArgs.rescue[1]}"`);
  
  console.log(`\n# BashoodPresaleFinal`);
  console.log(`# Constructor con 12 argumentos - verificar manualmente en Basescan UI`);
  console.log(`# O crear archivo de args: scripts/verify-presale-args.js`);
  
  console.log("\n" + "=".repeat(80) + "\n");
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// DEPLOYMENT MAIN
// ============================================================================

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 BASHOOD COMPLETE DEPLOYMENT");
  console.log("=".repeat(80));
  
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`\n📊 Network: ${network}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  // Cargar configuración
  const config = getConfig(network);
  
  // Validar configuración
  const errors = validateConfig(config, network);
  if (errors.length > 0) {
    console.error("\n❌ ERRORES DE CONFIGURACIÓN:");
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error("Configuración inválida");
  }
  
  console.log("\n✅ Configuración validada");
  
  // Confirmación interactiva para mainnet
  if (network === "base" || network === "baseMainnet") {
    console.log("\n⚠️  ADVERTENCIA: Estás por deployar a MAINNET");
    console.log("⚠️  Presiona Ctrl+C en los próximos 10 segundos para cancelar...");
    await delay(10000);
  }
  
  const addresses = {};
  const constructorArgs = {};
  
  console.log("\n" + "=".repeat(80));
  console.log("📦 DEPLOYMENT SEQUENCE");
  console.log("=".repeat(80));
  
  // ============================================================================
  // 1. Deploy BashoodToken
  // ============================================================================
  console.log("\n[1/6] Deploying BashoodToken...");
  const BashoodToken = await hre.ethers.getContractFactory("BashoodToken");
  const token = await BashoodToken.deploy(config.treasury);
  await token.waitForDeployment();
  addresses.token = await token.getAddress();
  constructorArgs.token = [config.treasury];
  console.log(`   ✅ BashoodToken: ${addresses.token}`);
  
  // ============================================================================
  // 2. Deploy MockNFT1155
  // ============================================================================
  console.log("\n[2/6] Deploying MockNFT1155...");
  const MockNFT1155 = await hre.ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
  const nft = await MockNFT1155.deploy();
  await nft.waitForDeployment();
  addresses.nft = await nft.getAddress();
  constructorArgs.nft = [];
  console.log(`   ✅ MockNFT1155: ${addresses.nft}`);
  
  // ============================================================================
  // 3. Deploy BashoodReferral
  // ============================================================================
  console.log("\n[3/6] Deploying BashoodReferral...");
  const BashoodReferral = await hre.ethers.getContractFactory("BashoodReferral");
  const referral = await BashoodReferral.deploy(
    deployer.address,           // _presaleAddress (temporal, se actualizará después)
    deployer.address,           // _validator (usar deployer como mock validator)
    addresses.nft               // _nftContract (MockNFT1155 ya deployado)
  );
  await referral.waitForDeployment();
  addresses.referral = await referral.getAddress();
  constructorArgs.referral = [deployer.address, deployer.address, addresses.nft];
  console.log(`   ✅ BashoodReferral: ${addresses.referral}`);
  
  // ============================================================================
  // 4. Deploy BashoodPaymentSplitter
  // ============================================================================
  console.log("\n[4/6] Deploying BashoodPaymentSplitter...");
  const BashoodPaymentSplitter = await hre.ethers.getContractFactory("BashoodPaymentSplitter");
  const payees = [
    config.developmentWallet,
    config.operationsWallet,
    config.marketingWallet,
    config.treasuryPSWallet
  ];
  const splitter = await BashoodPaymentSplitter.deploy(payees, config.shares);
  await splitter.waitForDeployment();
  addresses.splitter = await splitter.getAddress();
  constructorArgs.splitter = [payees, config.shares];
  console.log(`   ✅ PaymentSplitter: ${addresses.splitter}`);
  console.log(`      - Development (45%): ${payees[0]}`);
  console.log(`      - Operations (25%): ${payees[1]}`);
  console.log(`      - Marketing (20%): ${payees[2]}`);
  console.log(`      - Treasury (10%): ${payees[3]}`);
  
  // ============================================================================
  // 5. Deploy BashoodRescue
  // ============================================================================
  console.log("\n[5/6] Deploying BashoodRescue...");
  const BashoodRescue = await hre.ethers.getContractFactory("BashoodRescue");
  const rescue = await BashoodRescue.deploy(
    config.adminWallet,
    config.emergencyWallet
  );
  await rescue.waitForDeployment();
  addresses.rescue = await rescue.getAddress();
  constructorArgs.rescue = [config.adminWallet, config.emergencyWallet];
  console.log(`   ✅ BashoodRescue: ${addresses.rescue}`);
  
  // ============================================================================
  // 6. Deploy BashoodPresaleFinal
  // ============================================================================
  console.log("\n[6/6] Deploying BashoodPresaleFinal...");
  const BashoodPresaleFinal = await hre.ethers.getContractFactory("BashoodPresaleFinal");
  
  // Calcular total NFT supply
  const totalNFTSupply = config.maxSupply.reduce((a, b) => a + b, 0);
  
  const presale = await BashoodPresaleFinal.deploy(
    addresses.token,            // _bashoodToken
    addresses.nft,              // _nftContract
    addresses.referral,         // _referralContract
    addresses.splitter,         // _projectWallet (payable)
    config.nftPrices[0],        // _nftPriceETH (usamos precio del NFT ID 1)
    hre.ethers.parseEther("100"), // _nftPriceBHT (mock: 100 BHT)
    config.presaleStart,        // _presaleStart
    config.presaleEnd,          // _presaleEnd
    totalNFTSupply              // _maxNFTSupply
  );
  await presale.waitForDeployment();
  addresses.presale = await presale.getAddress();
  constructorArgs.presale = [
    addresses.token,
    addresses.nft,
    addresses.referral,
    addresses.splitter,
    config.nftPrices[0],
    hre.ethers.parseEther("100"),
    config.presaleStart,
    config.presaleEnd,
    totalNFTSupply
  ];
  console.log(`   ✅ BashoodPresaleFinal: ${addresses.presale}`);
  
  // ============================================================================
  // POST-DEPLOYMENT CONFIGURATION
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("⚙️  POST-DEPLOYMENT CONFIGURATION");
  console.log("=".repeat(80));
  
  // Mint NFTs a presale contract
  console.log("\n🎨 Minting NFTs to Presale contract...");
  for (let i = 0; i < config.maxSupply.length; i++) {
    const nftId = i + 1;
    const quantity = config.maxSupply[i];
    const tx = await nft.mint(addresses.presale, nftId, quantity, "0x");
    await tx.wait();
    console.log(`   ✅ NFT ID ${nftId}: ${quantity} units minted`);
  }
  
  // Configurar Presale address en Referral contract
  console.log("\n🔗 Setting Presale address in Referral contract...");
  const txRef = await referral.setPresaleContract(addresses.presale);
  await txRef.wait();
  console.log(`   ✅ Presale address configured in Referral`);
  
  // ============================================================================
  // SAVE & SUMMARY
  // ============================================================================
  const deploymentFile = saveDeployment(network, addresses);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ DEPLOYMENT COMPLETADO");
  console.log("=".repeat(80));
  
  console.log("\n📋 ADDRESSES DEPLOYED:");
  Object.entries(addresses).forEach(([name, addr]) => {
    console.log(`   ${name.padEnd(15)}: ${addr}`);
  });
  
  console.log("\n📊 CONTRACT SIZES:");
  const contracts = ["BashoodToken", "MockNFT1155", "BashoodReferral", "BashoodPaymentSplitter", "BashoodRescue", "BashoodPresaleFinal"];
  for (const contractName of contracts) {
    const artifact = await hre.artifacts.readArtifact(contractName);
    const bytecode = artifact.deployedBytecode;
    const sizeKB = (bytecode.length / 2 / 1024).toFixed(2);
    const percentage = ((bytecode.length / 2 / 24576) * 100).toFixed(1);
    console.log(`   ${contractName.padEnd(25)}: ${sizeKB} KB (${percentage}% del límite)`);
  }
  
  printVerificationCommands(network, addresses, constructorArgs);
  
  console.log("\n🎯 PRÓXIMOS PASOS:");
  console.log("   1. Verificar contratos en Basescan");
  console.log("   2. Ejecutar 10,000+ pruebas en testnet");
  console.log("   3. Transferir ownership a Multisig");
  console.log("   4. Configurar frontend con addresses");
  console.log("\n");
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });
