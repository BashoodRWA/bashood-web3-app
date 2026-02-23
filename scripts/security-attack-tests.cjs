const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🛡️  SECURITY ATTACK TESTS: Pruebas de Vulnerabilidades");
  console.log("=".repeat(80));

  const [deployer, attacker, buyer1, buyer2] = await ethers.getSigners();

  console.log(`\n📋 Configuración:`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Attacker: ${attacker.address}`);

  // ============================================
  // DEPLOYMENT
  // ============================================
  console.log(`\n📦 Desplegando contratos...`);
  
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = await BashoodToken.deploy(deployer.address);
  await bashoodToken.waitForDeployment();
  const tokenAddr = await bashoodToken.getAddress();

  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();
  const nftAddr = await mockNFT.getAddress();

  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("2300", 8));
  await mockPriceFeed.waitForDeployment();
  const priceFeedAddr = await mockPriceFeed.getAddress();

  const ReferralValidator = await ethers.getContractFactory("ReferralValidator");
  const validator = await ReferralValidator.deploy(deployer.address);
  await validator.waitForDeployment();
  const validatorAddr = await validator.getAddress();

  const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
  const bashoodReferral = await BashoodReferral.deploy(deployer.address, validatorAddr, nftAddr);
  await bashoodReferral.waitForDeployment();
  const referralAddr = await bashoodReferral.getAddress();

  const currentBlock = await ethers.provider.getBlock('latest');
  const presaleStart = currentBlock.timestamp + 10;
  const presaleEnd = currentBlock.timestamp + (30 * 24 * 60 * 60);

  const BashoodPresale = await ethers.getContractFactory("BashoodPresaleFinal");
  const bashoodPresale = await BashoodPresale.deploy(
    tokenAddr, nftAddr, referralAddr, deployer.address,
    ethers.parseEther("0.1"), ethers.parseUnits("25000", 18),
    presaleStart, presaleEnd, 10000
  );
  await bashoodPresale.waitForDeployment();
  const presaleAddr = await bashoodPresale.getAddress();

  console.log(`✅ Contratos desplegados`);

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  console.log(`\n⚙️  Configurando...`);
  let tx = await bashoodReferral.setPresaleContract(presaleAddr);
  await tx.wait();
  tx = await bashoodToken.transfer(presaleAddr, ethers.parseUnits("250000000", 18));
  await tx.wait();
  tx = await mockNFT.mint(presaleAddr, 1, 10000);
  await tx.wait();
  tx = await bashoodPresale.setPriceFeed(priceFeedAddr);
  await tx.wait();
  tx = await bashoodPresale.setOperationsWallet(deployer.address);
  await tx.wait();
  tx = await bashoodPresale.setSigner(deployer.address);
  await tx.wait();
  tx = await bashoodPresale.setMaxPriceStaleness(3600);
  await tx.wait();
  tx = await bashoodPresale.setMaxPerUser(100);
  await tx.wait();
  tx = await bashoodPresale.startPresale();
  await tx.wait();
  await ethers.provider.send("evm_increaseTime", [15]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✅ Configuración completa`);

  let attacksPassed = 0;
  let attacksBlocked = 0;
  let totalAttacks = 0;

  // ============================================
  // TEST 1: CANTIDAD CON DECIMALES (0.5 NFTs)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #1: Compra con cantidad decimal (0.5 NFTs)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    // Solidity no acepta decimals en uint256, pero probamos con wei
    const nonce = 1001;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar "0.5 NFTs" - esto debería fallar en el contrato
    // En realidad no se puede pasar 0.5 como uint256, pero probamos cantidad = 0
    const tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 0, nonce, signature, { value: ethers.parseEther("0.05") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Compra con cantidad 0 permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 2: CANTIDAD NEGATIVA
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #2: Compra con cantidad negativa");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1002;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // uint256 no puede ser negativo, pero probamos con número muy grande (overflow)
    const maxUint256 = ethers.MaxUint256;
    const tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, maxUint256, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Overflow de cantidad permitido");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 3: ETH INCORRECTO (menos del esperado)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #3: ETH incorrecto (pagar menos)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1003;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar 10 NFTs (1 ETH) pero pagar solo 0.5 ETH
    const tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 10, nonce, signature, { value: ethers.parseEther("0.5") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Pago incorrecto permitido");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 4: ETH INCORRECTO (más del esperado - dust attack)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #4: Pagar más ETH (dust attack)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1004;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar 1 NFT (0.1 ETH) pero pagar 0.2 ETH
    const tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.2") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Overpayment aceptado (fondos atrapados)");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 5: SIGNATURE REPLAY ATTACK
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #5: Signature Replay Attack");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1005;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Primera compra (legítima)
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    // Intentar reutilizar la misma signature (replay)
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Signature replay permitido");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 6: SIGNATURE DE OTRO USUARIO
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #6: Usar signature de otro usuario");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1006;
    // Generar signature para buyer1 pero usarla con attacker
    const signature = await signNonce(deployer, buyer1.address, nonce);
    
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Signature de otro usuario aceptada");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 7: SIGNATURE INVÁLIDA
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #7: Signature completamente inválida");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1007;
    // Signature falsa (bytes aleatorios)
    const fakeSignature = "0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890";
    
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, fakeSignature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Signature inválida aceptada");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 8: BYPASS maxPerUser
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #8: Bypass de maxPerUser (comprar más del límite)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1008;
    const signature = await signNonce(deployer, buyer2.address, nonce);
    
    // maxPerUser = 100, intentar comprar 101
    tx = await bashoodPresale.connect(buyer2).purchaseWithETH(
      1, 101, nonce, signature, { value: ethers.parseEther("10.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: maxPerUser bypass exitoso");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 9: COMPRA ANTES DE PRESALE START
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #9: Compra antes de presale start");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    // Desplegar nuevo presale con start en el futuro
    const futureBlock = await ethers.provider.getBlock('latest');
    const futureStart = futureBlock.timestamp + 1000;
    const futureEnd = futureBlock.timestamp + 2000;

    const BashoodPresale2 = await ethers.getContractFactory("BashoodPresaleFinal");
    const bashoodPresale2 = await BashoodPresale2.deploy(
      tokenAddr, nftAddr, referralAddr, deployer.address,
      ethers.parseEther("0.1"), ethers.parseUnits("25000", 18),
      futureStart, futureEnd, 10000
    );
    await bashoodPresale2.waitForDeployment();

    // Configurar
    tx = await bashoodToken.transfer(await bashoodPresale2.getAddress(), ethers.parseUnits("1000000", 18));
    await tx.wait();
    tx = await mockNFT.mint(await bashoodPresale2.getAddress(), 1, 100);
    await tx.wait();
    tx = await bashoodPresale2.setPriceFeed(priceFeedAddr);
    await tx.wait();
    tx = await bashoodPresale2.setSigner(deployer.address);
    await tx.wait();
    tx = await bashoodPresale2.setMaxPriceStaleness(3600);
    await tx.wait();
    tx = await bashoodPresale2.startPresale();
    await tx.wait();

    const nonce = 1009;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar ANTES del start time
    tx = await bashoodPresale2.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Compra antes de start permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 10: WEI ATTACK (valores muy pequeños)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #10: Wei attack (valores microscópicos)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1010;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar 1 NFT con solo 1 wei
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: 1n }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Wei attack exitoso");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 11: CANTIDAD EXTREMADAMENTE GRANDE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #11: Cantidad extremadamente grande (DoS)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1011;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar cantidad que causaría overflow en precio
    const hugeQty = ethers.parseUnits("1000000000", 0); // 1 billón
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, hugeQty, nonce, signature, { value: ethers.parseEther("100000000") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Cantidad extrema permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 12: NFTID INVÁLIDO
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #12: NFT ID inválido");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1012;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar NFT con ID 999 (no existe)
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      999, 1, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: NFT ID inválido aceptado");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 13: COMPRA SIN ETH (0 value)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #13: Compra sin enviar ETH");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1013;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: 0 }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Compra sin ETH permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 14: PRECISION ATTACK (decimales extremos en precio)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #14: Precision attack (rounding errors)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 1014;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar explotar errores de redondeo con cantidades específicas
    // Precio: 0.1 ETH por NFT
    // Enviar: 0.09999999999 ETH esperando que pase validación
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.09999999999") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Precision attack exitoso");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 15: MULTIPLE PURCHASES RAPID FIRE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #15: Rapid-fire multiple purchases (race condition)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    // Intentar hacer múltiples compras simultáneas para superar maxPerUser
    const promises = [];
    for (let i = 0; i < 5; i++) {
      const nonce = 1015 + i;
      const signature = await signNonce(deployer, attacker.address, nonce);
      
      promises.push(
        bashoodPresale.connect(attacker).purchaseWithETH(
          1, 50, nonce, signature, { value: ethers.parseEther("5") }
        )
      );
    }
    
    await Promise.all(promises);
    
    // Si pasa, verificar si superó maxPerUser
    const purchased = await bashoodPresale.userPurchases(attacker.address);
    if (purchased > 100n) {
      console.log(`❌ VULNERABILIDAD: Race condition - compró ${purchased} NFTs (límite: 100)`);
      attacksPassed++;
    } else {
      console.log("✅ BLOQUEADO: Race condition prevenida");
      attacksBlocked++;
    }
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // RESUMEN DE SEGURIDAD
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN DE SEGURIDAD");
  console.log("=".repeat(80));

  console.log(`\n🛡️  Ataques probados: ${totalAttacks}`);
  console.log(`✅ Ataques bloqueados: ${attacksBlocked}`);
  console.log(`❌ Vulnerabilidades encontradas: ${attacksPassed}`);
  
  const securityScore = ((attacksBlocked / totalAttacks) * 100).toFixed(2);
  console.log(`\n📈 Security Score: ${securityScore}%`);

  if (attacksPassed === 0) {
    console.log("\n✅ EXCELENTE: Todos los ataques fueron bloqueados");
    console.log("   El contrato tiene protecciones robustas contra ataques comunes");
  } else if (securityScore >= 80) {
    console.log("\n⚠️  BUENO: La mayoría de ataques bloqueados, pero hay vulnerabilidades");
    console.log(`   Revisar ${attacksPassed} vulnerabilidad(es) encontrada(s)`);
  } else {
    console.log("\n❌ CRÍTICO: Múltiples vulnerabilidades detectadas");
    console.log("   Se requiere revisión urgente del código");
  }

  console.log("\n" + "=".repeat(80));
  console.log("🔍 RECOMENDACIONES:");
  console.log("=".repeat(80));
  console.log("1. Revisar todas las validaciones de input");
  console.log("2. Implementar rate limiting si hay race conditions");
  console.log("3. Auditar manejo de overflow/underflow");
  console.log("4. Verificar sistema de signatures (replay protection)");
  console.log("5. Testear edge cases con valores extremos");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
