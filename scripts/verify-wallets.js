/**
 * Script de verificación de claves/carteras para Bashood
 * 
 * Verifica:
 * - Claves privadas y derivación de direcciones
 * - Capacidad de firma de mensajes
 * - Balances en la red configurada
 * - Ownership de contratos desplegados
 * - Permisos y roles en contratos
 * 
 * Uso:
 *   npx hardhat run scripts/verify-wallets.js --network <network>
 */

import hre from "hardhat";
const { ethers } = hre;

// Colores para la consola
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

async function verifyWalletDerivation(signer, walletName) {
  log(`\n${colors.bright}═══ Verificando ${walletName} ═══${colors.reset}`);
  
  try {
    const address = await signer.getAddress();
    logSuccess(`Dirección derivada: ${address}`);
    
    // Verificar que la dirección es válida
    if (!ethers.isAddress(address)) {
      logError("La dirección no es válida");
      return false;
    }
    
    logSuccess("Dirección válida");
    return true;
  } catch (error) {
    logError(`Error al derivar dirección: ${error.message}`);
    return false;
  }
}

async function verifySigningCapability(signer, walletName) {
  log(`\n${colors.bright}═══ Verificando capacidad de firma ${walletName} ═══${colors.reset}`);
  
  try {
    const address = await signer.getAddress();
    const message = `Bashood Verification - ${walletName} - ${Date.now()}`;
    
    logInfo(`Firmando mensaje: "${message}"`);
    const signature = await signer.signMessage(message);
    logSuccess(`Firma generada: ${signature.slice(0, 20)}...`);
    
    // Verificar la firma
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      logSuccess(`Firma verificada correctamente. Dirección recuperada: ${recoveredAddress}`);
      return true;
    } else {
      logError(`Firma inválida. Esperado: ${address}, Recuperado: ${recoveredAddress}`);
      return false;
    }
  } catch (error) {
    logError(`Error al firmar mensaje: ${error.message}`);
    return false;
  }
}

async function verifyBalance(signer, walletName, minBalance = "0.01") {
  log(`\n${colors.bright}═══ Verificando balance ${walletName} ═══${colors.reset}`);
  
  try {
    const address = await signer.getAddress();
    const balance = await ethers.provider.getBalance(address);
    const balanceEth = ethers.formatEther(balance);
    
    logInfo(`Balance: ${balanceEth} ETH`);
    
    const minBalanceWei = ethers.parseEther(minBalance);
    if (balance >= minBalanceWei) {
      logSuccess(`Balance suficiente (>= ${minBalance} ETH)`);
      return true;
    } else {
      logWarning(`Balance insuficiente para transacciones (< ${minBalance} ETH)`);
      return false;
    }
  } catch (error) {
    logError(`Error al verificar balance: ${error.message}`);
    return false;
  }
}

async function verifyContractOwnership(signer, contractAddress, contractName) {
  log(`\n${colors.bright}═══ Verificando ownership de ${contractName} ═══${colors.reset}`);
  
  try {
    if (!contractAddress || contractAddress === ethers.ZeroAddress) {
      logWarning(`${contractName} no está desplegado o dirección no configurada`);
      return null;
    }
    
    const signerAddress = await signer.getAddress();
    logInfo(`Contrato: ${contractAddress}`);
    logInfo(`Verificando owner: ${signerAddress}`);
    
    // Intentar obtener el owner (compatible con Ownable)
    const contract = await ethers.getContractAt(
      ["function owner() view returns (address)"],
      contractAddress
    );
    
    const owner = await contract.owner();
    logInfo(`Owner actual: ${owner}`);
    
    if (owner.toLowerCase() === signerAddress.toLowerCase()) {
      logSuccess(`${contractName}: El signer es el owner`);
      return true;
    } else {
      logError(`${contractName}: El signer NO es el owner`);
      return false;
    }
  } catch (error) {
    logWarning(`No se pudo verificar ownership: ${error.message}`);
    return null;
  }
}

async function verifyContractRoles(signer, contractAddress, contractName, roles = []) {
  log(`\n${colors.bright}═══ Verificando roles en ${contractName} ═══${colors.reset}`);
  
  try {
    if (!contractAddress || contractAddress === ethers.ZeroAddress) {
      logWarning(`${contractName} no está desplegado o dirección no configurada`);
      return null;
    }
    
    const signerAddress = await signer.getAddress();
    logInfo(`Contrato: ${contractAddress}`);
    logInfo(`Verificando roles para: ${signerAddress}`);
    
    // Intentar verificar roles (compatible con AccessControl)
    const contract = await ethers.getContractAt(
      [
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function getRoleAdmin(bytes32 role) view returns (bytes32)"
      ],
      contractAddress
    );
    
    const results = [];
    for (const roleName of roles) {
      const roleHash = ethers.id(roleName);
      const hasRole = await contract.hasRole(roleHash, signerAddress);
      
      if (hasRole) {
        logSuccess(`✓ Tiene rol: ${roleName}`);
        results.push(true);
      } else {
        logError(`✗ NO tiene rol: ${roleName}`);
        results.push(false);
      }
    }
    
    return results.every(r => r);
  } catch (error) {
    logWarning(`No se pudo verificar roles: ${error.message}`);
    return null;
  }
}

async function verifyNetwork() {
  log(`\n${colors.bright}${"═".repeat(60)}${colors.reset}`);
  log(`${colors.bright}VERIFICACIÓN DE RED${colors.reset}`);
  log(`${colors.bright}${"═".repeat(60)}${colors.reset}`);
  
  const network = await ethers.provider.getNetwork();
  const blockNumber = await ethers.provider.getBlockNumber();
  
  logInfo(`Red: ${network.name} (chainId: ${network.chainId})`);
  logInfo(`Último bloque: ${blockNumber}`);
  
  return network;
}

async function main() {
  try {
    // Verificar red
    const network = await verifyNetwork();
    
    // Obtener signers configurados
    const [deployer, admin, emergency, operations] = await ethers.getSigners();
    
    log(`\n${colors.bright}${"═".repeat(60)}${colors.reset}`);
    log(`${colors.bright}VERIFICACIÓN DE WALLETS${colors.reset}`);
    log(`${colors.bright}${"═".repeat(60)}${colors.reset}`);
    
    const results = {
      deployer: {},
      admin: {},
      emergency: {},
      operations: {}
    };
    
    // Verificar Deployer
    results.deployer.derivation = await verifyWalletDerivation(deployer, "Deployer");
    results.deployer.signing = await verifySigningCapability(deployer, "Deployer");
    results.deployer.balance = await verifyBalance(deployer, "Deployer", "0.1");
    
    // Verificar Admin
    if (admin) {
      results.admin.derivation = await verifyWalletDerivation(admin, "Admin");
      results.admin.signing = await verifySigningCapability(admin, "Admin");
      results.admin.balance = await verifyBalance(admin, "Admin", "0.01");
    }
    
    // Verificar Emergency
    if (emergency) {
      results.emergency.derivation = await verifyWalletDerivation(emergency, "Emergency");
      results.emergency.signing = await verifySigningCapability(emergency, "Emergency");
      results.emergency.balance = await verifyBalance(emergency, "Emergency", "0.01");
    }
    
    // Verificar Operations
    if (operations) {
      results.operations.derivation = await verifyWalletDerivation(operations, "Operations");
      results.operations.signing = await verifySigningCapability(operations, "Operations");
      results.operations.balance = await verifyBalance(operations, "Operations", "0.01");
    }
    
    // Verificar contratos desplegados (si existen)
    log(`\n${colors.bright}${"═".repeat(60)}${colors.reset}`);
    log(`${colors.bright}VERIFICACIÓN DE CONTRATOS${colors.reset}`);
    log(`${colors.bright}${"═".repeat(60)}${colors.reset}`);
    
    // Configurar direcciones de contratos desplegados aquí
    const CHAINLINK_PRICEFEED_ADDRESS = process.env.CHAINLINK_PRICEFEED_ADDRESS || "";
    const RESCUE_ADDRESS = process.env.RESCUE_ADDRESS || "";
    const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS || "";
    const MULTITOKEN_ADDRESS = process.env.MULTITOKEN_ADDRESS || "";
    const REFERRAL_ADDRESS = process.env.REFERRAL_ADDRESS || "";
    
    let contractResults = {
      chainlinkPriceFeed: null,
      rescue: null,
      presale: null,
      multitoken: null,
      referral: null
    };
    
    // Verificar ChainlinkPriceFeed
    if (CHAINLINK_PRICEFEED_ADDRESS && CHAINLINK_PRICEFEED_ADDRESS !== ethers.ZeroAddress) {
      contractResults.chainlinkPriceFeed = await verifyContractOwnership(
        deployer, 
        CHAINLINK_PRICEFEED_ADDRESS, 
        "ChainlinkPriceFeed"
      );
      
      // Verificar configuración del contrato
      try {
        const priceFeed = await ethers.getContractAt(
          "contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed",
          CHAINLINK_PRICEFEED_ADDRESS
        );
        
        const stalenessThreshold = await priceFeed.stalenessThreshold();
        const maxChangePct = await priceFeed.maxChangePct();
        const feedAddress = await priceFeed.feed();
        
        logInfo(`Staleness Threshold: ${stalenessThreshold} segundos`);
        logInfo(`Max Change %: ${maxChangePct}%`);
        logInfo(`Feed Address: ${feedAddress}`);
        
        if (stalenessThreshold > 0 && maxChangePct > 0) {
          logSuccess("Configuración del ChainlinkPriceFeed correcta");
        } else {
          logWarning("Configuración del ChainlinkPriceFeed puede requerir ajustes");
        }
      } catch (error) {
        logWarning(`No se pudo verificar configuración: ${error.message}`);
      }
    }
    
    // Verificar BashoodRescue
    if (RESCUE_ADDRESS && RESCUE_ADDRESS !== ethers.ZeroAddress) {
      contractResults.rescue = await verifyContractOwnership(deployer, RESCUE_ADDRESS, "BashoodRescue");
      await verifyContractRoles(admin, RESCUE_ADDRESS, "BashoodRescue", ["ADMIN_ROLE"]);
      await verifyContractRoles(emergency, RESCUE_ADDRESS, "BashoodRescue", ["EMERGENCY_ROLE"]);
    }
    
    // Verificar BashoodPresaleFinal
    if (PRESALE_ADDRESS && PRESALE_ADDRESS !== ethers.ZeroAddress) {
      contractResults.presale = await verifyContractOwnership(deployer, PRESALE_ADDRESS, "BashoodPresaleFinal");
      await verifyContractRoles(admin, PRESALE_ADDRESS, "BashoodPresaleFinal", ["ADMIN_ROLE"]);
    }
    
    // Verificar BashoodMultiToken
    if (MULTITOKEN_ADDRESS && MULTITOKEN_ADDRESS !== ethers.ZeroAddress) {
      contractResults.multitoken = await verifyContractOwnership(deployer, MULTITOKEN_ADDRESS, "BashoodMultiToken");
      await verifyContractRoles(admin, MULTITOKEN_ADDRESS, "BashoodMultiToken", ["MINTER_ROLE"]);
    }
    
    // Verificar BashoodReferral
    if (REFERRAL_ADDRESS && REFERRAL_ADDRESS !== ethers.ZeroAddress) {
      contractResults.referral = await verifyContractOwnership(deployer, REFERRAL_ADDRESS, "BashoodReferral");
    }
    
    // Si no hay contratos configurados
    const hasContracts = Object.values(contractResults).some(r => r !== null);
    if (!hasContracts) {
      logWarning("No hay contratos configurados para verificar.");
      logInfo("Añade las direcciones en las variables de entorno o edita el script directamente.");
    }
    
    // Resumen final
    log(`\n${colors.bright}${"═".repeat(60)}${colors.reset}`);
    log(`${colors.bright}RESUMEN DE VERIFICACIÓN${colors.reset}`);
    log(`${colors.bright}${"═".repeat(60)}${colors.reset}`);
    
    let allPassed = true;
    
    for (const [walletName, checks] of Object.entries(results)) {
      if (Object.keys(checks).length === 0) continue;
      
      const passed = Object.values(checks).every(v => v === true);
      allPassed = allPassed && passed;
      
      if (passed) {
        logSuccess(`${walletName}: TODAS LAS VERIFICACIONES PASARON`);
      } else {
        logError(`${walletName}: FALLÓ AL MENOS UNA VERIFICACIÓN`);
      }
    }
    
    log("");
    if (allPassed) {
      logSuccess("✓ TODAS LAS WALLETS VERIFICADAS CORRECTAMENTE");
      logSuccess("✓ LISTO PARA DESPLIEGUE/OPERACIONES");
    } else {
      logError("✗ ALGUNAS VERIFICACIONES FALLARON");
      logError("✗ REVISAR CONFIGURACIÓN ANTES DE CONTINUAR");
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Error fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

export default main;

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
