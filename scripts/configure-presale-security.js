// Script de Configuración de Seguridad para BashoodPresaleFinal
// Mitiga riesgos medios: Whitelist, MaxPerUser, Signer
// Uso: npx hardhat run scripts/configure-presale-security.js --network <network>

const hre = require("hardhat");
const ethers = hre.ethers;

// ============================================
// CONFIGURACIÓN DE SEGURIDAD RECOMENDADA
// ============================================
const SECURITY_CONFIG = {
  // Whitelist habilitada para compliance KYC/AML
  whitelistEnabled: true,
  
  // Límite por usuario (evita centralización de ballenas)
  // Valor sugerido: 10 ETH en fiat equivalente
  maxPerUser: ethers.parseEther("10"), // 10 ETH worth of purchases
  
  // Oracle staleness (1 hora = 3600 segundos)
  // Más restrictivo que default para activos industriales de alto valor
  maxPriceStaleness: 3600,
  
  // Burn y discount conservadores
  burnBps: 500,      // 5% burn
  discountBps: 1000, // 10% discount para pagos en BHT
  
  // Signer address (DEBE ser multisig en producción)
  // Este address firma las whitelists
  signerAddress: null, // Se configura abajo según red
  
  // Operations wallet (recibe BHT de pagos)
  operationsWallet: null, // Se configura abajo según red
};

// ============================================
// CONFIGURACIÓN POR RED
// ============================================
const NETWORK_CONFIG = {
  "base-sepolia": {
    // Testnet: usar deployer como signer temporalmente
    useDeployerAsSigner: true,
    useDeployerAsOps: true,
  },
  "base-mainnet": {
    // PRODUCCIÓN: DEBE usar multisig
    multisigSigner: "0x0000000000000000000000000000000000000000", // TODO: Actualizar
    multisigOps: "0x0000000000000000000000000000000000000000",    // TODO: Actualizar
    useDeployerAsSigner: false,
    useDeployerAsOps: false,
  },
  "localhost": {
    // Hardhat local
    useDeployerAsSigner: true,
    useDeployerAsOps: true,
  },
  "hardhat": {
    // Hardhat network
    useDeployerAsSigner: true,
    useDeployerAsOps: true,
  }
};

async function main() {
  console.log("🔐 CONFIGURANDO SEGURIDAD DE BASHOOD PRESALE");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deployer account:", deployer.address);

  // Validar que existe configuración para esta red
  const networkConfig = NETWORK_CONFIG[hre.network.name];
  if (!networkConfig) {
    throw new Error(`❌ No hay configuración para la red: ${hre.network.name}`);
  }

  // ============================================
  // PASO 1: Obtener dirección del contrato
  // ============================================
  const presaleAddress = process.env.PRESALE_ADDRESS;
  if (!presaleAddress) {
    console.error("\n❌ ERROR: Debes especificar PRESALE_ADDRESS");
    console.log("\nUso:");
    console.log("  PRESALE_ADDRESS=0x... npx hardhat run scripts/configure-presale-security.js --network base-sepolia");
    process.exit(1);
  }

  console.log("\n📦 Presale contract:", presaleAddress);

  // Conectar al contrato
  const BashoodPresale = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
  const presale = BashoodPresale.attach(presaleAddress);

  // Verificar que el deployer tiene rol de ADMIN
  const ADMIN_ROLE = await presale.ADMIN_ROLE();
  const isAdmin = await presale.hasRole(ADMIN_ROLE, deployer.address);
  
  if (!isAdmin) {
    throw new Error(`❌ ${deployer.address} no tiene ADMIN_ROLE en el contrato`);
  }
  console.log("✅ Verificado: deployer tiene ADMIN_ROLE");

  // ============================================
  // PASO 2: Configurar Signer y Operations Wallet
  // ============================================
  console.log("\n⚙️  PASO 2: Configurando Signer y Operations Wallet");
  console.log("-".repeat(60));

  let signerAddress;
  let opsWalletAddress;

  if (networkConfig.useDeployerAsSigner) {
    signerAddress = deployer.address;
    console.log("⚠️  Usando deployer como signer (SOLO para testing)");
  } else {
    signerAddress = networkConfig.multisigSigner;
    if (signerAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("❌ PRODUCCIÓN: Debes actualizar multisigSigner en NETWORK_CONFIG");
    }
    console.log("🔐 Usando multisig como signer:", signerAddress);
  }

  if (networkConfig.useDeployerAsOps) {
    opsWalletAddress = deployer.address;
    console.log("⚠️  Usando deployer como operations wallet (SOLO para testing)");
  } else {
    opsWalletAddress = networkConfig.multisigOps;
    if (opsWalletAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("❌ PRODUCCIÓN: Debes actualizar multisigOps en NETWORK_CONFIG");
    }
    console.log("🔐 Usando multisig como operations wallet:", opsWalletAddress);
  }

  // Configurar signer
  console.log("\n→ Configurando signer address...");
  let tx = await presale.setSigner(signerAddress);
  await tx.wait();
  console.log("✅ Signer configurado:", signerAddress);

  // Configurar operations wallet
  console.log("\n→ Configurando operations wallet...");
  tx = await presale.setOperationsWallet(opsWalletAddress);
  await tx.wait();
  console.log("✅ Operations wallet configurado:", opsWalletAddress);

  // ============================================
  // PASO 3: Configurar Whitelist
  // ============================================
  console.log("\n⚙️  PASO 3: Configurando Whitelist (KYC/AML Compliance)");
  console.log("-".repeat(60));

  const currentWhitelistStatus = await presale.whitelistEnabled();
  console.log("Estado actual whitelist:", currentWhitelistStatus ? "HABILITADA" : "DESHABILITADA");

  if (currentWhitelistStatus !== SECURITY_CONFIG.whitelistEnabled) {
    console.log(`\n→ Cambiando whitelist a: ${SECURITY_CONFIG.whitelistEnabled ? "HABILITADA" : "DESHABILITADA"}`);
    tx = await presale.setWhitelistEnabled(SECURITY_CONFIG.whitelistEnabled);
    await tx.wait();
    console.log("✅ Whitelist configurada");
  } else {
    console.log("✅ Whitelist ya está en el estado correcto");
  }

  if (SECURITY_CONFIG.whitelistEnabled) {
    console.log("\n📋 IMPORTANTE - Whitelist Habilitada:");
    console.log("  • Solo usuarios con firma válida del signer pueden comprar");
    console.log("  • Implementar proceso KYC/AML off-chain");
    console.log("  • Signer debe generar firmas para usuarios aprobados");
    console.log(`  • Signer address: ${signerAddress}`);
  } else {
    console.log("\n⚠️  ADVERTENCIA - Whitelist Deshabilitada:");
    console.log("  • Cualquiera puede comprar (sin KYC/AML)");
    console.log("  • Riesgo regulatorio para activos industriales");
    console.log("  • NO recomendado para mainnet con activos reales");
  }

  // ============================================
  // PASO 4: Configurar Límite por Usuario
  // ============================================
  console.log("\n⚙️  PASO 4: Configurando MaxPerUser (Anti-Ballena)");
  console.log("-".repeat(60));

  const currentMaxPerUser = await presale.maxPerUser();
  console.log("Límite actual por usuario:", ethers.formatEther(currentMaxPerUser), "ETH equivalente");

  if (currentMaxPerUser !== SECURITY_CONFIG.maxPerUser) {
    console.log(`\n→ Configurando nuevo límite: ${ethers.formatEther(SECURITY_CONFIG.maxPerUser)} ETH equivalente`);
    tx = await presale.setMaxPerUser(SECURITY_CONFIG.maxPerUser);
    await tx.wait();
    console.log("✅ MaxPerUser configurado");
  } else {
    console.log("✅ MaxPerUser ya está en el valor correcto");
  }

  console.log("\n📋 Protección anti-centralización:");
  console.log(`  • Máximo por usuario: ${ethers.formatEther(SECURITY_CONFIG.maxPerUser)} ETH en fiat`);
  console.log("  • Evita que una ballena compre toda la preventa");
  console.log("  • Promueve distribución justa de activos industriales");

  // ============================================
  // PASO 5: Configurar Oracle Staleness
  // ============================================
  console.log("\n⚙️  PASO 5: Configurando Oracle Staleness");
  console.log("-".repeat(60));

  const currentStaleness = await presale.maxPriceStaleness();
  console.log("Staleness actual:", currentStaleness.toString(), "segundos");

  if (currentStaleness !== BigInt(SECURITY_CONFIG.maxPriceStaleness)) {
    console.log(`\n→ Configurando staleness: ${SECURITY_CONFIG.maxPriceStaleness}s (${SECURITY_CONFIG.maxPriceStaleness / 3600}h)`);
    tx = await presale.setMaxPriceStaleness(SECURITY_CONFIG.maxPriceStaleness);
    await tx.wait();
    console.log("✅ MaxPriceStaleness configurado");
  } else {
    console.log("✅ MaxPriceStaleness ya está en el valor correcto");
  }

  console.log("\n📋 Protección contra oracle stale:");
  console.log(`  • Máximo: ${SECURITY_CONFIG.maxPriceStaleness / 3600} hora(s)`);
  console.log("  • Precios más antiguos serán rechazados");
  console.log("  • Crítico para activos de alto valor ($100k-$500k)");

  // ============================================
  // PASO 6: Configurar Burn y Discount
  // ============================================
  console.log("\n⚙️  PASO 6: Configurando Burn y Discount BPS");
  console.log("-".repeat(60));

  const currentBurnBps = await presale.burnBps();
  const currentDiscountBps = await presale.bhtDiscountBps();
  
  console.log("Burn actual:", currentBurnBps.toString(), "bps (", (Number(currentBurnBps) / 100), "%)");
  console.log("Discount actual:", currentDiscountBps.toString(), "bps (", (Number(currentDiscountBps) / 100), "%)");

  if (currentBurnBps !== BigInt(SECURITY_CONFIG.burnBps)) {
    console.log(`\n→ Configurando burnBps: ${SECURITY_CONFIG.burnBps} (${SECURITY_CONFIG.burnBps / 100}%)`);
    tx = await presale.setBurnBps(SECURITY_CONFIG.burnBps);
    await tx.wait();
    console.log("✅ BurnBps configurado");
  } else {
    console.log("✅ BurnBps ya está en el valor correcto");
  }

  if (currentDiscountBps !== BigInt(SECURITY_CONFIG.discountBps)) {
    console.log(`\n→ Configurando discountBps: ${SECURITY_CONFIG.discountBps} (${SECURITY_CONFIG.discountBps / 100}%)`);
    tx = await presale.setDiscountBps(SECURITY_CONFIG.discountBps);
    await tx.wait();
    console.log("✅ DiscountBps configurado");
  } else {
    console.log("✅ DiscountBps ya está en el valor correcto");
  }

  console.log("\n📋 Tokenomics configurados:");
  console.log(`  • Burn en pagos BHT: ${SECURITY_CONFIG.burnBps / 100}%`);
  console.log(`  • Discount pagos BHT: ${SECURITY_CONFIG.discountBps / 100}%`);
  console.log("  • Incentiva uso de BHT con descuento razonable");
  console.log("  • Burn deflacionario dentro de límites seguros (<15%)");

  // ============================================
  // PASO 7: Resumen de Seguridad
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ CONFIGURACIÓN DE SEGURIDAD COMPLETADA");
  console.log("=".repeat(60));

  console.log("\n📊 RESUMEN DE CONFIGURACIÓN:\n");
  
  console.log("🔐 CONTROL DE ACCESO:");
  console.log(`  ✅ Signer: ${signerAddress}`);
  console.log(`  ✅ Operations Wallet: ${opsWalletAddress}`);
  console.log(`  ✅ Whitelist: ${SECURITY_CONFIG.whitelistEnabled ? "HABILITADA" : "DESHABILITADA"}`);
  
  console.log("\n🛡️  PROTECCIONES ECONÓMICAS:");
  console.log(`  ✅ Max por usuario: ${ethers.formatEther(SECURITY_CONFIG.maxPerUser)} ETH fiat`);
  console.log(`  ✅ Burn BHT: ${SECURITY_CONFIG.burnBps / 100}%`);
  console.log(`  ✅ Discount BHT: ${SECURITY_CONFIG.discountBps / 100}%`);
  
  console.log("\n⏰ ORACLE:");
  console.log(`  ✅ Max staleness: ${SECURITY_CONFIG.maxPriceStaleness / 3600}h`);

  // ============================================
  // PASO 8: Validaciones Finales
  // ============================================
  console.log("\n🔍 VALIDACIONES FINALES:\n");

  // Verificar oracle configurado
  const priceFeed = await presale.priceFeed();
  if (priceFeed === "0x0000000000000000000000000000000000000000") {
    console.log("❌ CRÍTICO: PriceFeed NO está configurado");
    console.log("   → Ejecutar: presale.setPriceFeed(CHAINLINK_ORACLE_ADDRESS)");
  } else {
    console.log("✅ PriceFeed configurado:", priceFeed);
  }

  // Verificar rescue contract
  const rescueContract = await presale.rescueContract();
  if (rescueContract === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Rescue contract NO configurado (opcional pero recomendado)");
  } else {
    console.log("✅ Rescue contract:", rescueContract);
  }

  // Verificar estado de presale
  const presaleActive = await presale.presaleActive();
  console.log(`\n📍 Estado presale: ${presaleActive ? "ACTIVA" : "INACTIVA"}`);
  
  if (!presaleActive) {
    console.log("\n⚠️  Para activar la preventa:");
    console.log("   → presale.startPresale()");
  }

  // ============================================
  // ADVERTENCIAS FINALES
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  CHECKLIST ANTES DE STARTPRESALE()");
  console.log("=".repeat(60));

  const checklist = [
    { item: "Signer configurado con multisig", done: !networkConfig.useDeployerAsSigner },
    { item: "Operations wallet configurado", done: opsWalletAddress !== "0x0000000000000000000000000000000000000000" },
    { item: "Whitelist habilitada para KYC/AML", done: SECURITY_CONFIG.whitelistEnabled },
    { item: "MaxPerUser configurado (anti-ballena)", done: SECURITY_CONFIG.maxPerUser > 0 },
    { item: "Oracle PriceFeed configurado", done: priceFeed !== "0x0000000000000000000000000000000000000000" },
    { item: "Oracle staleness < 1 hora", done: SECURITY_CONFIG.maxPriceStaleness <= 3600 },
    { item: "BurnBps dentro de límites (<15%)", done: SECURITY_CONFIG.burnBps <= 1500 },
    { item: "DiscountBps dentro de límites (<20%)", done: SECURITY_CONFIG.discountBps <= 2000 },
  ];

  let allPassed = true;
  checklist.forEach(check => {
    const status = check.done ? "✅" : "❌";
    console.log(`${status} ${check.item}`);
    if (!check.done) allPassed = false;
  });

  console.log("\n" + "=".repeat(60));
  
  if (allPassed) {
    console.log("✅ TODOS LOS CHECKS PASADOS - LISTO PARA PRODUCCIÓN");
  } else {
    console.log("⚠️  HAY ITEMS PENDIENTES - REVISAR ANTES DE MAINNET");
  }
  
  console.log("=".repeat(60) + "\n");

  // Guardar configuración
  const configInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    presaleAddress: presaleAddress,
    configuration: {
      signer: signerAddress,
      operationsWallet: opsWalletAddress,
      whitelistEnabled: SECURITY_CONFIG.whitelistEnabled,
      maxPerUser: ethers.formatEther(SECURITY_CONFIG.maxPerUser) + " ETH",
      maxPriceStaleness: SECURITY_CONFIG.maxPriceStaleness + "s",
      burnBps: SECURITY_CONFIG.burnBps,
      discountBps: SECURITY_CONFIG.discountBps,
    },
    validations: {
      priceFeed: priceFeed,
      rescueContract: rescueContract,
      presaleActive: presaleActive,
    },
    checklist: checklist
  };

  const fs = require("fs");
  const filename = `presale-security-config-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(configInfo, null, 2));
  console.log(`📄 Configuración guardada en: ${filename}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  });
