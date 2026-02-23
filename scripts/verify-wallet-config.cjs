const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("VERIFICACION DE CONFIGURACION DE WALLETS");
  console.log("=".repeat(80));
  
  // Leer variables de entorno
  const TREASURY = process.env.TREASURY_WALLET;
  const OPERATIONS = process.env.OPERATIONS_WALLET;
  const DEVELOPMENT = process.env.DEVELOPMENT_WALLET;
  const MARKETING = process.env.MARKETING_WALLET;
  const TREASURY_PS = process.env.TREASURY_PS_WALLET;
  const SIGNER = process.env.SIGNER_WALLET;
  
  console.log("\nDirecciones configuradas:");
  console.log("  Treasury (token):    " + (TREASURY || "NO CONFIGURADA"));
  console.log("  Operations (presale):" + (OPERATIONS || "NO CONFIGURADA"));
  console.log("  Development (45%):   " + (DEVELOPMENT || "NO CONFIGURADA"));
  console.log("  Marketing (20%):     " + (MARKETING || "NO CONFIGURADA"));
  console.log("  Treasury PS (10%):   " + (TREASURY_PS || "NO CONFIGURADA"));
  console.log("  Signer:              " + (SIGNER || "NO CONFIGURADA"));
  
  // Validar que todas están configuradas
  if (!TREASURY || !OPERATIONS || !DEVELOPMENT || !MARKETING || !TREASURY_PS) {
    console.log("\nERROR: Faltan wallets por configurar en .env");
    console.log("Revisa el archivo METAMASK_SETUP_BASE_SEPOLIA.md");
    process.exit(1);
  }
  
  // Validar que son diferentes
  console.log("\nValidando unicidad de wallets...");
  const wallets = [TREASURY, OPERATIONS, DEVELOPMENT, MARKETING, TREASURY_PS];
  const unique = new Set(wallets);
  
  if (unique.size !== wallets.length) {
    console.log("ERROR: Hay wallets duplicadas!");
    console.log("\nWallets que se repiten:");
    wallets.forEach((w, i) => {
      const count = wallets.filter(x => x === w).length;
      if (count > 1) {
        console.log("  " + w + " aparece " + count + " veces");
      }
    });
    process.exit(1);
  }
  
  console.log("  OK: Todas las wallets son diferentes");
  
  // Validar que treasury !== operations (CRÍTICO)
  if (TREASURY === OPERATIONS) {
    console.log("\nERROR CRITICO: Treasury y Operations son la misma wallet!");
    console.log("Esto causará problemas de contabilidad (ver PRODUCTION_WALLET_CONFIG.md)");
    process.exit(1);
  }
  
  console.log("  OK: Treasury y Operations son diferentes (CRITICO)");
  
  // Verificar balance del deployer
  console.log("\nVerificando deployer...");
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("  Address: " + deployer.address);
  console.log("  Balance: " + ethers.formatEther(balance) + " ETH");
  
  const MIN_BALANCE = ethers.parseEther("0.1");
  const RECOMMENDED_BALANCE = ethers.parseEther("0.3");
  
  if (balance < MIN_BALANCE) {
    console.log("\nERROR: Balance insuficiente!");
    console.log("Necesitas al menos 0.1 ETH (recomendado: 0.3 ETH)");
    console.log("\nVisita estos faucets de Base Sepolia:");
    console.log("  - https://www.alchemy.com/faucets/base-sepolia");
    console.log("  - https://portal.cdp.coinbase.com/products/faucet");
    console.log("  - https://faucet.quicknode.com/base/sepolia");
    process.exit(1);
  } else if (balance < RECOMMENDED_BALANCE) {
    console.log("  ADVERTENCIA: Balance bajo (< 0.3 ETH)");
    console.log("  Recomendado obtener más ETH de faucets antes de deployment");
  } else {
    console.log("  OK: Balance suficiente para deployment");
  }
  
  // Verificar network
  console.log("\nVerificando network...");
  const network = await ethers.provider.getNetwork();
  console.log("  Chain ID: " + network.chainId);
  console.log("  Network:  " + network.name);
  
  if (network.chainId !== 84532n) {
    console.log("  ADVERTENCIA: No estas en Base Sepolia (ChainID: 84532)");
    console.log("  Network actual: " + network.name + " (" + network.chainId + ")");
  } else {
    console.log("  OK: Conectado a Base Sepolia");
  }
  
  // Resumen final
  console.log("\n" + "=".repeat(80));
  console.log("RESUMEN");
  console.log("=".repeat(80));
  console.log("  Wallets configuradas:  5/5");
  console.log("  Wallets unicas:        OK");
  console.log("  Treasury != Operations: OK");
  console.log("  Balance deployer:      " + ethers.formatEther(balance) + " ETH");
  console.log("  Network:               " + (network.chainId === 84532n ? "Base Sepolia OK" : "INCORRECTO"));
  
  const allGood = unique.size === 5 && 
                  TREASURY !== OPERATIONS && 
                  balance >= MIN_BALANCE && 
                  network.chainId === 84532n;
  
  if (allGood) {
    console.log("\nESTADO: LISTO PARA DEPLOYMENT");
    console.log("\nProximo paso:");
    console.log("  npx hardhat run scripts/deploy-baseSepolia.cjs --network baseSepolia");
  } else {
    console.log("\nESTADO: REVISAR CONFIGURACION");
    console.log("Corrige los errores antes de deployment");
  }
  
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nERROR:", error.message);
    process.exit(1);
  });
