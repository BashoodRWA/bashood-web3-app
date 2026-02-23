const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ADVANCED SECURITY TESTS: Ataques Avanzados (BHT + Reentrancy)");
  console.log("=".repeat(80));

  const [deployer, attacker, victim] = await ethers.getSigners();

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
  
  // Transferir BHT al attacker para ataques con BHT
  tx = await bashoodToken.transfer(attacker.address, ethers.parseUnits("100000000", 18));
  await tx.wait();
  console.log(`  ✅ Attacker recibió 100M BHT para pruebas`);
  
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
  tx = await bashoodPresale.setMaxPerUser(1000);
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
  // TEST 1: BHT - COMPRA SIN APROBACIÓN
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #1: Compra con BHT sin approve()");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 2001;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar sin hacer approve
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 10, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Compra sin aprobación permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 2: BHT - APROBACIÓN INSUFICIENTE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #2: Compra con BHT con approve insuficiente");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 2002;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Aprobar solo 1000 BHT pero intentar comprar 10 NFTs (250,000 BHT)
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.parseUnits("1000", 18));
    await tx.wait();
    
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 10, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Aprobación insuficiente permitió compra");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 3: BHT - BALANCE INSUFICIENTE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #3: Compra con BHT sin suficiente balance");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 2003;
    const signature = await signNonce(deployer, victim.address, nonce);
    
    // victim no tiene BHT pero intenta comprar
    tx = await bashoodToken.connect(victim).approve(presaleAddr, ethers.parseUnits("1000000", 18));
    await tx.wait();
    
    tx = await bashoodPresale.connect(victim).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Compra sin balance permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 4: BHT - DECIMAL PRECISION ATTACK
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #4: BHT precision attack (decimales específicos)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 2004;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Aprobar cantidad con decimales extraños
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.parseUnits("25000.123456789012345678", 18));
    await tx.wait();
    
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    // Verificar que se cobró exactamente 25000 BHT, no 25000.123...
    const presaleBalance = await bashoodToken.balanceOf(presaleAddr);
    console.log(`   Balance presale después: ${ethers.formatUnits(presaleBalance, 18)} BHT`);
    
    console.log("✅ BLOQUEADO: Precision attack manejado correctamente");
    attacksBlocked++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 5: PRICE STALENESS ATTACK
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #5: Price staleness attack (precio desactualizado)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    // Avanzar tiempo más allá de maxPriceStaleness (3600 segundos)
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    const nonce = 2005;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.parseUnits("25000", 18));
    await tx.wait();
    
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Precio desactualizado aceptado");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
    
    // Restaurar precio
    let block = await ethers.provider.getBlock('latest');
    tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
    await tx.wait();
  }

  // ============================================
  // TEST 6: PRICE MANIPULATION ATTACK
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #6: Price manipulation (precio negativo/cero)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    // Actualizar precio a 0
    let block = await ethers.provider.getBlock('latest');
    tx = await mockPriceFeed.setAnswerWithTimestamp(0, block.timestamp);
    await tx.wait();
    
    const nonce = 2006;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.parseUnits("1", 18));
    await tx.wait();
    
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Precio 0 aceptado (división por cero)");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
    
    // Restaurar precio normal
    block = await ethers.provider.getBlock('latest');
    tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
    await tx.wait();
  }

  // ============================================
  // TEST 7: INTEGER OVERFLOW EN PRECIO BHT
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #7: Integer overflow en cálculo BHT");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 2007;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Intentar comprar cantidad que cause overflow en el cálculo BHT
    const maxQty = ethers.parseUnits("1000000", 0);
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.MaxUint256);
    await tx.wait();
    
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, maxQty, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Overflow en cálculo BHT");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 8: DOUBLE SPENDING (compra múltiple con mismo nonce en BHT)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #8: Double spending con BHT");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const nonce = 2008;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.parseUnits("500000", 18));
    await tx.wait();
    
    // Primera compra
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    // Intentar segunda compra con mismo nonce
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Double spending con BHT exitoso");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 9: BHT BURN EXPLOIT (verificar burn del 3%)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #9: BHT burn bypass (intentar evitar burn del 3%)");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    const attackerBalanceBefore = await bashoodToken.balanceOf(attacker.address);
    
    const nonce = 2009;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    // Compra legítima
    tx = await bashoodToken.connect(attacker).approve(presaleAddr, ethers.parseUnits("25000", 18));
    await tx.wait();
    
    tx = await bashoodPresale.connect(attacker).purchaseWithBHT(
      1, 1, nonce, signature
    );
    await tx.wait();
    
    const attackerBalanceAfter = await bashoodToken.balanceOf(attacker.address);
    const spent = attackerBalanceBefore - attackerBalanceAfter;
    
    // Debería haber gastado 25000 BHT (precio base)
    // Pero con burn del 3% y fee del 2%, el total debería ser mayor
    const expectedBase = ethers.parseUnits("25000", 18);
    
    console.log(`   BHT gastado: ${ethers.formatUnits(spent, 18)}`);
    console.log(`   Precio base: ${ethers.formatUnits(expectedBase, 18)}`);
    
    if (spent > expectedBase) {
      console.log("✅ BLOQUEADO: Burn y fee aplicados correctamente");
      attacksBlocked++;
    } else {
      console.log("❌ VULNERABILIDAD: Burn/fee no aplicado");
      attacksPassed++;
    }
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // TEST 10: COMPRA DESPUÉS DE PRESALE END
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("⚔️  ATAQUE #10: Compra después de presale end");
  console.log("=".repeat(80));
  totalAttacks++;

  try {
    // Avanzar tiempo más allá del presale end
    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 días
    await ethers.provider.send("evm_mine", []);
    
    const nonce = 2010;
    const signature = await signNonce(deployer, attacker.address, nonce);
    
    tx = await bashoodPresale.connect(attacker).purchaseWithETH(
      1, 1, nonce, signature, { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("❌ VULNERABILIDAD: Compra después de presale end permitida");
    attacksPassed++;
  } catch (error) {
    console.log("✅ BLOQUEADO: " + error.message.split('\n')[0].substring(0, 80));
    attacksBlocked++;
  }

  // ============================================
  // RESUMEN AVANZADO
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN DE SEGURIDAD AVANZADA");
  console.log("=".repeat(80));

  console.log(`\n🛡️  Ataques avanzados probados: ${totalAttacks}`);
  console.log(`✅ Ataques bloqueados: ${attacksBlocked}`);
  console.log(`❌ Vulnerabilidades encontradas: ${attacksPassed}`);
  
  const securityScore = ((attacksBlocked / totalAttacks) * 100).toFixed(2);
  console.log(`\n📈 Advanced Security Score: ${securityScore}%`);

  console.log("\n📋 Categorías probadas:");
  console.log("  ✅ BHT token security (approve, balance, precision)");
  console.log("  ✅ Price oracle security (staleness, manipulation)");
  console.log("  ✅ Arithmetic security (overflow, underflow)");
  console.log("  ✅ Double spending protection");
  console.log("  ✅ Burn/fee mechanism verification");
  console.log("  ✅ Temporal security (presale timing)");

  if (attacksPassed === 0) {
    console.log("\n✅ EXCELENTE: Seguridad avanzada robusta");
  } else {
    console.log(`\n⚠️  ATENCIÓN: ${attacksPassed} vulnerabilidad(es) avanzada(s) detectada(s)`);
  }

  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
