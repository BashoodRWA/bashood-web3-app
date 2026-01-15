/**
 * Script de despliegue para ChainlinkPriceFeed
 * 
 * Despliega el contrato ChainlinkPriceFeed con un feed mock o real
 * 
 * Uso:
 *   npx hardhat run scripts/deploy-chainlink-pricefeed.js --network <network>
 */

import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Desplegando ChainlinkPriceFeed");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
  
  // Para testing local, desplegamos un MockPriceFeed primero
  // Para producción, usa la dirección real del Chainlink Price Feed
  let feedAddress;
  
  const network = await ethers.provider.getNetwork();
  
  if (network.chainId === 31337n) { // Hardhat local
    console.log("Red local detectada. Desplegando MockPriceFeed...");
    const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockFeed = await MockPriceFeed.deploy(
      8, // decimals
      ethers.parseUnits("2000", 8) // $2000 USD
    );
    await mockFeed.waitForDeployment();
    feedAddress = await mockFeed.getAddress();
    console.log(`✓ MockPriceFeed desplegado en: ${feedAddress}\n`);
  } else {
    // Para otras redes, usar la dirección del Chainlink Price Feed real
    // Ejemplo para ETH/USD en diferentes redes:
    const chainlinkFeeds = {
      1: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // Mainnet ETH/USD
      11155111: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia ETH/USD
      137: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", // Polygon MATIC/USD
    };
    
    feedAddress = chainlinkFeeds[Number(network.chainId)];
    
    if (!feedAddress) {
      console.log("⚠ No hay feed configurado para esta red.");
      console.log("Por favor, proporciona la dirección del Chainlink Price Feed:");
      feedAddress = process.env.CHAINLINK_FEED_ADDRESS;
      
      if (!feedAddress) {
        throw new Error("CHAINLINK_FEED_ADDRESS no configurado en .env");
      }
    }
    
    console.log(`Usando Chainlink Feed: ${feedAddress}`);
  }
  
  // Desplegar ChainlinkPriceFeed
  console.log("Desplegando ChainlinkPriceFeed...");
  const ChainlinkPriceFeed = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
  const priceFeed = await ChainlinkPriceFeed.deploy(feedAddress);
  
  await priceFeed.waitForDeployment();
  const priceFeedAddress = await priceFeed.getAddress();
  
  console.log(`✓ ChainlinkPriceFeed desplegado en: ${priceFeedAddress}`);
  
  // Verificar configuración inicial
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Verificando configuración inicial");
  console.log("═══════════════════════════════════════════════════");
  
  const owner = await priceFeed.owner();
  const feed = await priceFeed.feed();
  const stalenessThreshold = await priceFeed.stalenessThreshold();
  const maxChangePct = await priceFeed.maxChangePct();
  
  console.log(`Owner: ${owner}`);
  console.log(`Feed: ${feed}`);
  console.log(`Staleness Threshold: ${stalenessThreshold} segundos`);
  console.log(`Max Change %: ${maxChangePct}%`);
  
  // Intentar obtener precio
  try {
    console.log("\nObteniendo precio actual...");
    const [price, decimals, updatedAt] = await priceFeed.peekLatestPrice();
    const formattedPrice = Number(price) / (10 ** Number(decimals));
    const date = new Date(Number(updatedAt) * 1000);
    
    console.log(`✓ Precio: $${formattedPrice.toFixed(2)}`);
    console.log(`  Decimals: ${decimals}`);
    console.log(`  Updated At: ${date.toISOString()}`);
  } catch (error) {
    console.log(`⚠ No se pudo obtener precio: ${error.message}`);
  }
  
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Información para .env");
  console.log("═══════════════════════════════════════════════════");
  console.log(`\nAñade estas líneas a tu .env:`);
  console.log(`CHAINLINK_PRICEFEED_ADDRESS=${priceFeedAddress}`);
  if (network.chainId === 31337n) {
    console.log(`MOCK_PRICEFEED_ADDRESS=${feedAddress}`);
  }
  
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Próximos pasos:");
  console.log("═══════════════════════════════════════════════════");
  console.log("1. Añade CHAINLINK_PRICEFEED_ADDRESS a tu .env");
  console.log("2. Ejecuta: npx hardhat run scripts/verify-wallets.js --network <network>");
  console.log("3. Si es necesario, ajusta stalenessThreshold y maxChangePct");
  console.log("═══════════════════════════════════════════════════\n");
}

export default main;

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
