// Script de deployment de BashoodRWAReference para Base Sepolia
// Uso: npx hardhat run scripts/deploy-rwa-reference.js --network base-sepolia

const hre = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYMENT DE BASHOOD RWA REFERENCE");
  console.log("Network:", hre.network.name);
  console.log("Timestamp:", new Date().toISOString());
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  // Deploy BashoodRWAReference como proxy upgradeable
  console.log("📦 Deploying BashoodRWAReference (Upgradeable Proxy)...");
  const BashoodRWAReference = await hre.ethers.getContractFactory("BashoodRWAReference");
  
  // Deploy con proxy usando OpenZeppelin Upgrades
  const contract = await hre.upgrades.deployProxy(
    BashoodRWAReference,
    [
      "Bashood Industrial Assets",  // name
      "BIA",                         // symbol
      "https://metadata.bashood.com/",  // baseURI
      deployer.address               // admin
    ],
    { 
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ BashoodRWAReference deployed to:", contractAddress);
  console.log("");

  // Información para verificación en Basescan
  console.log("========================================");
  console.log("📋 DEPLOYMENT INFO");
  console.log("========================================");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Block Explorer:", hre.network.name === 'base-sepolia' 
    ? `https://sepolia.basescan.org/address/${contractAddress}`
    : `https://basescan.org/address/${contractAddress}`
  );
  console.log("");

  // Verificar que el contrato está correctamente inicializado
  console.log("🔍 Verificando inicialización...");
  const name = await contract.name();
  const symbol = await contract.symbol();
  const owner = await contract.owner();
  
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Owner:", owner);
  console.log("");

  console.log("========================================");
  console.log("✅ DEPLOYMENT COMPLETADO");
  console.log("========================================");
  console.log("");
  console.log("🔗 Próximos pasos:");
  console.log("1. Verifica el contrato en Basescan:");
  console.log(`   npx hardhat verify --network base-sepolia ${contractAddress}`);
  console.log("");
  console.log("2. Mintea los NFTs piloto (tokens 202-206):");
  console.log(`   npx hardhat run scripts/mint-pilot-nfts.js --network base-sepolia`);
  console.log("");

  return {
    contractAddress,
    deployer: deployer.address,
    network: hre.network.name,
    name,
    symbol,
    owner
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante deployment:");
    console.error(error);
    process.exit(1);
  });
