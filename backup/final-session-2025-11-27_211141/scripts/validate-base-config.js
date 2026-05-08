// Validar configuración y conexión a Base Network
// Uso: npx hardhat run scripts/validate-base-config.js --network base-sepolia

const hre = require("hardhat");
const ethers = hre.ethers;

async function validateEnvironment() {
  console.log("\n📋 VALIDANDO VARIABLES DE ENTORNO\n");
  
  const required = [
    "BASE_SEPOLIA_RPC",
    "BASE_SEPOLIA_PRIVATE_KEY"
  ];

  if (hre.network.name === "base-mainnet") {
    required.push("BASE_MAINNET_RPC");
    required.push("BASE_MAINNET_PRIVATE_KEY");
  }

  let allValid = true;
  for (const env of required) {
    const value = process.env[env];
    if (value) {
      const masked = value.substring(0, 10) + "..." + value.substring(value.length - 6);
      console.log(`✅ ${env}: ${masked}`);
    } else {
      console.log(`❌ ${env}: NOT SET`);
      allValid = false;
    }
  }

  return allValid;
}

async function validateNetwork() {
  console.log("\n🌐 VALIDANDO CONEXIÓN A BASE\n");

  try {
    const provider = hre.ethers.provider;
    
    // Get block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Block Number: ${blockNumber}`);

    // Get gas price
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
    console.log(`✅ Gas Price: ${gasPriceGwei} gwei`);

    // Get network info
    const network = await provider.getNetwork();
    console.log(`✅ Chain ID: ${network.chainId}`);
    console.log(`✅ Network Name: ${network.name}`);

    // Validate expected chain ID
    const expectedChainId = hre.network.name === "base-sepolia" ? 84532 : 8453;
    if (network.chainId !== expectedChainId) {
      console.log(`⚠️  Warning: Expected chain ID ${expectedChainId}, got ${network.chainId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`❌ Error connecting to Base: ${error.message}`);
    return false;
  }
}

async function validateSigner() {
  console.log("\n👤 VALIDANDO SIGNER/DEPLOYER\n");

  try {
    const [signer] = await ethers.getSigners();
    const address = await signer.getAddress();
    console.log(`✅ Signer Address: ${address}`);

    // Check balance
    const balance = await ethers.provider.getBalance(address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`✅ Balance: ${balanceEth} ETH`);

    if (parseFloat(balanceEth) === 0) {
      console.log(`⚠️  WARNING: Account has 0 ETH. Get testnet ETH from faucet:`);
      if (hre.network.name === "base-sepolia") {
        console.log(`   https://www.base.org/docs/using-base/quickstart#faucet`);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.log(`❌ Error validating signer: ${error.message}`);
    return false;
  }
}

async function validateContractSetup() {
  console.log("\n🔧 VALIDANDO SETUP DE CONTRATOS\n");

  try {
    // Check if contracts are compiled
    const artifacts = await hre.artifacts.getBuildInfos();
    if (artifacts.length === 0) {
      console.log(`⚠️  No compiled contracts found. Run: npx hardhat compile`);
      return false;
    }

    const requiredContracts = [
      "BashoodToken",
      "BashoodPresaleFinal",
      "BashoodReferral",
      "BashoodRescue"
    ];

    for (const contract of requiredContracts) {
      try {
        await hre.artifacts.readArtifact(contract);
        console.log(`✅ ${contract}: Compiled`);
      } catch (e) {
        console.log(`❌ ${contract}: Not compiled`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.log(`⚠️  ${error.message}`);
    return false;
  }
}

async function estimateDeploymentCosts() {
  console.log("\n💰 ESTIMANDO COSTOS DE DEPLOYMENT\n");

  try {
    const [signer] = await ethers.getSigners();
    
    // Estimate token contract deployment
    const BashoodToken = await hre.ethers.getContractFactory("BashoodToken");
    const tokenEstimate = await hre.ethers.provider.estimateGas(
      BashoodToken.getDeployTransaction(await signer.getAddress())
    );
    const tokenGasCost = ethers.formatEther(tokenEstimate * (await hre.ethers.provider.getGasPrice()));
    console.log(`📊 BashoodToken: ~${tokenGasCost} ETH`);

    // Rough estimates for others (based on bytecode)
    console.log(`📊 BashoodPresale: ~0.001-0.002 ETH`);
    console.log(`📊 BashoodReferral: ~0.0008-0.0015 ETH`);
    console.log(`📊 BashoodRescue: ~0.0005-0.0010 ETH`);
    console.log(`\n📊 Total estimate: ~0.004-0.007 ETH`);

    // Get testnet faucet info
    if (hre.network.name === "base-sepolia") {
      console.log(`\n💡 For testing on Base Sepolia, get 0.01 ETH from faucet:`);
      console.log(`   https://www.base.org/docs/using-base/quickstart#faucet`);
    }

    return true;
  } catch (error) {
    console.log(`⚠️  Could not estimate gas: ${error.message}`);
    return false;
  }
}

async function validateBasescanAPI() {
  console.log("\n🔍 VALIDANDO BASESCAN API\n");

  const apiKey = process.env.BASESCAN_API_KEY;
  if (!apiKey) {
    console.log(`⚠️  BASESCAN_API_KEY not set. Get one from:`);
    console.log(`   https://basescan.org/apis`);
    return false;
  }

  try {
    // Quick validation of API key format
    if (apiKey.length < 20) {
      console.log(`❌ Invalid API key format`);
      return false;
    }

    console.log(`✅ BASESCAN_API_KEY: Set (${apiKey.substring(0, 10)}...)`);
    console.log(`✅ You can now verify contracts with:`);
    console.log(`   npx hardhat verify --network ${hre.network.name} ADDRESS [args...]`);

    return true;
  } catch (error) {
    console.log(`⚠️  ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log(`🔷 BASE NETWORK VALIDATION - ${hre.network.name.toUpperCase()}`);
  console.log("=".repeat(70));

  const checks = [
    { name: "Environment Variables", fn: validateEnvironment },
    { name: "Network Connection", fn: validateNetwork },
    { name: "Signer/Deployer", fn: validateSigner },
    { name: "Contract Setup", fn: validateContractSetup },
    { name: "Deployment Costs", fn: estimateDeploymentCosts },
    { name: "Basescan API", fn: validateBasescanAPI }
  ];

  const results = [];
  for (const check of checks) {
    const result = await check.fn();
    results.push({ name: check.name, passed: result });
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMEN DE VALIDACIÓN\n");

  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${result.name}`);
  }

  const allPassed = results.every(r => r.passed);
  
  console.log("\n" + "=".repeat(70));
  if (allPassed) {
    console.log("✅ ¡Configuración lista para deployment a Base!");
    console.log("\n🚀 Próximos pasos:");
    console.log("   1. npx hardhat compile");
    console.log(`   2. npx hardhat run scripts/deploy-base.js --network ${hre.network.name}`);
  } else {
    console.log("⚠️  ¡Existen problemas en la configuración!");
    console.log("   Revisa los errores arriba y corrígelos antes de continuar.");
  }
  console.log("=".repeat(70) + "\n");

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error("❌ Validation script error:", error);
  process.exit(1);
});
