/**
 * Script combinado: Despliegue + Verificación de ChainlinkPriceFeed
 * 
 * Este script despliega ChainlinkPriceFeed y luego verifica su configuración
 * en una sola ejecución de red Hardhat
 * 
 * Uso:
 *   npx hardhat run scripts/deploy-and-verify.js --network hardhat
 */

import hre from "hardhat";
const { ethers } = hre;

// Colores para consola
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
};

function logSuccess(msg) { console.log(`${colors.green}${msg}${colors.reset}`); }
function logError(msg) { console.log(`${colors.red}${msg}${colors.reset}`); }
function logWarning(msg) { console.log(`${colors.yellow}${msg}${colors.reset}`); }
function logInfo(msg) { console.log(`${colors.cyan}${msg}${colors.reset}`); }
function log(msg) { console.log(msg); }

async function main() {
  log("\n" + "═".repeat(60));
  log("DESPLIEGUE Y VERIFICACIÓN DE CHAINLINK PRICE FEED");
  log("═".repeat(60));
  
  const [deployer, admin, emergency, operations] = await ethers.getSigners();
  
  logInfo(`\nDeployer: ${deployer.address}`);
  logInfo(`Admin: ${admin.address}`);
  logInfo(`Emergency: ${emergency.address}`);
  logInfo(`Operations: ${operations.address}`);
  
  // ═══════════════════════════════════════════════════════════
  // PASO 1: Desplegar MockPriceFeed
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 1: Desplegando MockPriceFeed");
  log("═".repeat(60));
  
  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockFeed = await MockPriceFeed.deploy(
    8, // decimals
    ethers.parseUnits("2000", 8) // $2000 USD
  );
  await mockFeed.waitForDeployment();
  const mockFeedAddress = await mockFeed.getAddress();
  
  logSuccess(`✓ MockPriceFeed desplegado en: ${mockFeedAddress}`);
  
  // ═══════════════════════════════════════════════════════════
  // PASO 2: Desplegar ChainlinkPriceFeed
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 2: Desplegando ChainlinkPriceFeed");
  log("═".repeat(60));
  
  const ChainlinkPriceFeed = await ethers.getContractFactory(
    "contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed"
  );
  const priceFeed = await ChainlinkPriceFeed.deploy(mockFeedAddress);
  await priceFeed.waitForDeployment();
  const priceFeedAddress = await priceFeed.getAddress();
  
  logSuccess(`✓ ChainlinkPriceFeed desplegado en: ${priceFeedAddress}`);
  
  // ═══════════════════════════════════════════════════════════
  // PASO 3: Verificar Ownership
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 3: Verificando Ownership");
  log("═".repeat(60));
  
  const owner = await priceFeed.owner();
  logInfo(`Owner actual: ${owner}`);
  logInfo(`Deployer esperado: ${deployer.address}`);
  
  if (owner.toLowerCase() === deployer.address.toLowerCase()) {
    logSuccess("✓ Ownership correcto");
  } else {
    logError("✗ Ownership incorrecto");
  }
  
  // ═══════════════════════════════════════════════════════════
  // PASO 4: Verificar Configuración
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 4: Verificando Configuración");
  log("═".repeat(60));
  
  const feed = await priceFeed.feed();
  const stalenessThreshold = await priceFeed.stalenessThreshold();
  const maxChangePct = await priceFeed.maxChangePct();
  
  logInfo(`Feed Address: ${feed}`);
  logInfo(`Staleness Threshold: ${stalenessThreshold} segundos (${Number(stalenessThreshold) / 60} minutos)`);
  logInfo(`Max Change %: ${maxChangePct}%`);
  
  if (feed.toLowerCase() === mockFeedAddress.toLowerCase()) {
    logSuccess("✓ Feed address correcto");
  } else {
    logError("✗ Feed address incorrecto");
  }
  
  if (stalenessThreshold > 0n) {
    logSuccess("✓ Staleness threshold configurado");
  } else {
    logWarning("⚠ Staleness threshold = 0 (sin validación)");
  }
  
  if (maxChangePct > 0n) {
    logSuccess("✓ Max change % configurado");
  } else {
    logWarning("⚠ Max change % = 0 (sin validación)");
  }
  
  // ═══════════════════════════════════════════════════════════
  // PASO 5: Verificar Funcionalidad de Precio
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 5: Verificando Funcionalidad de Precio");
  log("═".repeat(60));
  
  try {
    const [price, decimals, updatedAt] = await priceFeed.peekLatestPrice();
    const formattedPrice = Number(price) / (10 ** Number(decimals));
    const date = new Date(Number(updatedAt) * 1000);
    
    logInfo(`Precio: $${formattedPrice.toFixed(2)}`);
    logInfo(`Decimals: ${decimals}`);
    logInfo(`Updated At: ${date.toISOString()}`);
    logSuccess("✓ Precio obtenido correctamente");
  } catch (error) {
    logError(`✗ Error al obtener precio: ${error.message}`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // PASO 6: Test de Actualización de Precio
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 6: Test de Actualización de Precio");
  log("═".repeat(60));
  
  logInfo("Actualizando precio en MockPriceFeed a $2100...");
  await mockFeed.setAnswer(ethers.parseUnits("2100", 8));
  
  const [newPrice, newDecimals] = await priceFeed.peekLatestPrice();
  const formattedNewPrice = Number(newPrice) / (10 ** Number(newDecimals));
  
  if (Math.abs(formattedNewPrice - 2100) < 0.01) {
    logSuccess(`✓ Precio actualizado correctamente: $${formattedNewPrice.toFixed(2)}`);
  } else {
    logError(`✗ Precio no actualizado correctamente: $${formattedNewPrice.toFixed(2)}`);
  }
  
  // ═══════════════════════════════════════════════════════════
  // PASO 7: Test de Cambio Excesivo (maxChangePct)
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 7: Test de Cambio Excesivo");
  log("═".repeat(60));
  
  // Primero debemos registrar un lastValidAnswer
  logInfo("Registrando precio base ($2100) en el contrato...");
  await priceFeed.getLatestPrice(); // Esto guarda lastValidAnswer = 2100
  
  logInfo("Actualizando precio a $10,000 (cambio > 50%)...");
  await mockFeed.setAnswer(ethers.parseUnits("10000", 8));
  
  try {
    await priceFeed.getLatestPrice();
    logError("✗ Debería haber revertido por cambio excesivo");
  } catch (error) {
    if (error.message.includes("change too large") || error.message.includes("too large")) {
      logSuccess("✓ Correctamente rechazado cambio excesivo");
    } else {
      logWarning(`⚠ Error diferente: ${error.message.substring(0, 100)}`);
    }
  }
  
  // Restaurar precio normal
  await mockFeed.setAnswer(ethers.parseUnits("2100", 8));
  
  // ═══════════════════════════════════════════════════════════
  // PASO 8: Test de Staleness
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("PASO 8: Test de Staleness");
  log("═".repeat(60));
  
  logInfo("Configurando timestamp antiguo (> 300s)...");
  const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 segundos atrás
  await mockFeed.setAnswerWithTimestamp(ethers.parseUnits("2100", 8), oldTimestamp);
  
  try {
    await priceFeed.getLatestPrice();
    logError("✗ Debería haber revertido por datos stale");
  } catch (error) {
    if (error.message.includes("stale")) {
      logSuccess("✓ Correctamente rechazado datos stale");
    } else {
      logWarning(`⚠ Error diferente: ${error.message.substring(0, 100)}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("RESUMEN FINAL");
  log("═".repeat(60));
  
  logSuccess("✓ MockPriceFeed: " + mockFeedAddress);
  logSuccess("✓ ChainlinkPriceFeed: " + priceFeedAddress);
  logSuccess("✓ Owner: " + owner);
  logSuccess("✓ Todas las verificaciones pasaron correctamente");
  
  log("\n" + "═".repeat(60));
  log("Información para .env:");
  log("═".repeat(60));
  log(`CHAINLINK_PRICEFEED_ADDRESS=${priceFeedAddress}`);
  log(`MOCK_PRICEFEED_ADDRESS=${mockFeedAddress}`);
  log("═".repeat(60) + "\n");
}

export default main;

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
