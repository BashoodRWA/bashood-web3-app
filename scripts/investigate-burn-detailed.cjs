const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔬 INVESTIGACIÓN DETALLADA: BHT Burn/Fee Mechanism");
  console.log("=".repeat(80));

  const [deployer, alice, bob, charlie] = await ethers.getSigners();

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

  console.log(`✅ BashoodToken: ${tokenAddr}`);
  console.log(`✅ BashoodPresale: ${presaleAddr}`);

  // ============================================
  // CONFIGURACIÓN INICIAL
  // ============================================
  console.log(`\n⚙️  Configurando...`);
  let tx = await bashoodReferral.setPresaleContract(presaleAddr);
  await tx.wait();
  tx = await bashoodToken.transfer(presaleAddr, ethers.parseUnits("250000000", 18));
  await tx.wait();
  tx = await bashoodToken.transfer(alice.address, ethers.parseUnits("10000000", 18));
  await tx.wait();
  tx = await bashoodToken.transfer(bob.address, ethers.parseUnits("10000000", 18));
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

  // ============================================
  // PASO 1: LEER PARÁMETROS DEL TOKEN
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 PASO 1: PARÁMETROS DEL BHT TOKEN");
  console.log("=".repeat(80));

  const burnRate = await bashoodToken.burnRate();
  const treasuryFee = await bashoodToken.treasuryFee();
  const treasuryWallet = await bashoodToken.treasuryWallet();
  const totalSupply = await bashoodToken.totalSupply();

  console.log(`\n  Burn Rate: ${burnRate} bps (${(Number(burnRate) / 100).toFixed(2)}%)`);
  console.log(`  Treasury Fee: ${treasuryFee} bps (${(Number(treasuryFee) / 100).toFixed(2)}%)`);
  console.log(`  Total deducción: ${Number(burnRate) + Number(treasuryFee)} bps (${((Number(burnRate) + Number(treasuryFee)) / 100).toFixed(2)}%)`);
  console.log(`  Treasury Wallet: ${treasuryWallet}`);
  console.log(`  Total Supply: ${ethers.formatUnits(totalSupply, 18)} BHT`);

  // Verificar si hay función de exención
  console.log(`\n🔍 Buscando funciones de exención...`);
  try {
    // Intentar llamar funciones comunes de exención
    const hasExempt = bashoodToken.interface.fragments.some(f => 
      f.name && (f.name.includes('exempt') || f.name.includes('Exempt') || f.name.includes('exclude'))
    );
    
    if (hasExempt) {
      console.log(`  ✅ Funciones de exención encontradas en el contrato`);
    } else {
      console.log(`  ℹ️  No se encontraron funciones públicas de exención`);
    }
  } catch (e) {
    console.log(`  ℹ️  No se pueden leer funciones de exención`);
  }

  // ============================================
  // PASO 2: TRANSFER DIRECTO (Alice → Bob)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 PASO 2: TRANSFER DIRECTO (Alice → Bob)");
  console.log("=".repeat(80));

  const aliceBalanceBefore1 = await bashoodToken.balanceOf(alice.address);
  const bobBalanceBefore1 = await bashoodToken.balanceOf(bob.address);
  const treasuryBalanceBefore1 = await bashoodToken.balanceOf(treasuryWallet);
  const totalSupplyBefore1 = await bashoodToken.totalSupply();

  console.log(`\n📊 Balances ANTES del transfer:`);
  console.log(`  Alice:    ${ethers.formatUnits(aliceBalanceBefore1, 18)} BHT`);
  console.log(`  Bob:      ${ethers.formatUnits(bobBalanceBefore1, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalanceBefore1, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(totalSupplyBefore1, 18)} BHT`);

  const transferAmount = ethers.parseUnits("10000", 18);
  console.log(`\n💸 Alice transfiere ${ethers.formatUnits(transferAmount, 18)} BHT a Bob...`);
  
  tx = await bashoodToken.connect(alice).transfer(bob.address, transferAmount);
  const receipt1 = await tx.wait();

  const aliceBalanceAfter1 = await bashoodToken.balanceOf(alice.address);
  const bobBalanceAfter1 = await bashoodToken.balanceOf(bob.address);
  const treasuryBalanceAfter1 = await bashoodToken.balanceOf(treasuryWallet);
  const totalSupplyAfter1 = await bashoodToken.totalSupply();

  console.log(`\n📊 Balances DESPUÉS del transfer:`);
  console.log(`  Alice:    ${ethers.formatUnits(aliceBalanceAfter1, 18)} BHT`);
  console.log(`  Bob:      ${ethers.formatUnits(bobBalanceAfter1, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalanceAfter1, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(totalSupplyAfter1, 18)} BHT`);

  const aliceSpent1 = aliceBalanceBefore1 - aliceBalanceAfter1;
  const bobReceived1 = bobBalanceAfter1 - bobBalanceBefore1;
  const treasuryReceived1 = treasuryBalanceAfter1 - treasuryBalanceBefore1;
  const burned1 = totalSupplyBefore1 - totalSupplyAfter1;

  console.log(`\n📊 MOVIMIENTOS:`);
  console.log(`  Alice gastó:      ${ethers.formatUnits(aliceSpent1, 18)} BHT`);
  console.log(`  Bob recibió:      ${ethers.formatUnits(bobReceived1, 18)} BHT`);
  console.log(`  Treasury recibió: ${ethers.formatUnits(treasuryReceived1, 18)} BHT`);
  console.log(`  Burned:           ${ethers.formatUnits(burned1, 18)} BHT`);

  // Calcular porcentajes reales
  const burnPercent1 = (Number(burned1) * 100 / Number(aliceSpent1)).toFixed(4);
  const feePercent1 = (Number(treasuryReceived1) * 100 / Number(aliceSpent1)).toFixed(4);
  const receivedPercent1 = (Number(bobReceived1) * 100 / Number(aliceSpent1)).toFixed(4);

  console.log(`\n📈 PORCENTAJES REALES:`);
  console.log(`  Burn:     ${burnPercent1}% (esperado: ${(Number(burnRate) / 100).toFixed(2)}%)`);
  console.log(`  Fee:      ${feePercent1}% (esperado: ${(Number(treasuryFee) / 100).toFixed(2)}%)`);
  console.log(`  Recibido: ${receivedPercent1}% (esperado: ${(10000 - Number(burnRate) - Number(treasuryFee)) / 100}%)`);

  const directTransferWorks = burned1 > 0n && treasuryReceived1 > 0n;
  console.log(`\n✓ Transfer directo aplica burn/fee: ${directTransferWorks ? '✅ SÍ' : '❌ NO'}`);

  // ============================================
  // PASO 3: TRANSFERFROM (Bob → Charlie vía Alice)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 PASO 3: TRANSFERFROM (Bob → Charlie vía Alice como spender)");
  console.log("=".repeat(80));

  const bobBalanceBefore2 = await bashoodToken.balanceOf(bob.address);
  const charlieBalanceBefore2 = await bashoodToken.balanceOf(charlie.address);
  const treasuryBalanceBefore2 = await bashoodToken.balanceOf(treasuryWallet);
  const totalSupplyBefore2 = await bashoodToken.totalSupply();

  console.log(`\n📊 Balances ANTES del transferFrom:`);
  console.log(`  Bob:      ${ethers.formatUnits(bobBalanceBefore2, 18)} BHT`);
  console.log(`  Charlie:  ${ethers.formatUnits(charlieBalanceBefore2, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalanceBefore2, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(totalSupplyBefore2, 18)} BHT`);

  const transferAmount2 = ethers.parseUnits("5000", 18);
  console.log(`\n💸 Bob aprueba a Alice para transferir ${ethers.formatUnits(transferAmount2, 18)} BHT...`);
  tx = await bashoodToken.connect(bob).approve(alice.address, transferAmount2);
  await tx.wait();

  console.log(`💸 Alice ejecuta transferFrom de Bob a Charlie...`);
  tx = await bashoodToken.connect(alice).transferFrom(bob.address, charlie.address, transferAmount2);
  const receipt2 = await tx.wait();

  const bobBalanceAfter2 = await bashoodToken.balanceOf(bob.address);
  const charlieBalanceAfter2 = await bashoodToken.balanceOf(charlie.address);
  const treasuryBalanceAfter2 = await bashoodToken.balanceOf(treasuryWallet);
  const totalSupplyAfter2 = await bashoodToken.totalSupply();

  console.log(`\n📊 Balances DESPUÉS del transferFrom:`);
  console.log(`  Bob:      ${ethers.formatUnits(bobBalanceAfter2, 18)} BHT`);
  console.log(`  Charlie:  ${ethers.formatUnits(charlieBalanceAfter2, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalanceAfter2, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(totalSupplyAfter2, 18)} BHT`);

  const bobSpent2 = bobBalanceBefore2 - bobBalanceAfter2;
  const charlieReceived2 = charlieBalanceAfter2 - charlieBalanceBefore2;
  const treasuryReceived2 = treasuryBalanceAfter2 - treasuryBalanceBefore2;
  const burned2 = totalSupplyBefore2 - totalSupplyAfter2;

  console.log(`\n📊 MOVIMIENTOS:`);
  console.log(`  Bob gastó:        ${ethers.formatUnits(bobSpent2, 18)} BHT`);
  console.log(`  Charlie recibió:  ${ethers.formatUnits(charlieReceived2, 18)} BHT`);
  console.log(`  Treasury recibió: ${ethers.formatUnits(treasuryReceived2, 18)} BHT`);
  console.log(`  Burned:           ${ethers.formatUnits(burned2, 18)} BHT`);

  const burnPercent2 = (Number(burned2) * 100 / Number(bobSpent2)).toFixed(4);
  const feePercent2 = (Number(treasuryReceived2) * 100 / Number(bobSpent2)).toFixed(4);
  const receivedPercent2 = (Number(charlieReceived2) * 100 / Number(bobSpent2)).toFixed(4);

  console.log(`\n📈 PORCENTAJES REALES:`);
  console.log(`  Burn:     ${burnPercent2}% (esperado: ${(Number(burnRate) / 100).toFixed(2)}%)`);
  console.log(`  Fee:      ${feePercent2}% (esperado: ${(Number(treasuryFee) / 100).toFixed(2)}%)`);
  console.log(`  Recibido: ${receivedPercent2}%`);

  const transferFromWorks = burned2 > 0n && treasuryReceived2 > 0n;
  console.log(`\n✓ TransferFrom aplica burn/fee: ${transferFromWorks ? '✅ SÍ' : '❌ NO'}`);

  // ============================================
  // PASO 4: COMPRA CON BHT VÍA PRESALE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 PASO 4: COMPRA CON BHT VÍA PRESALE");
  console.log("=".repeat(80));

  const aliceBalanceBefore3 = await bashoodToken.balanceOf(alice.address);
  const presaleBalanceBefore3 = await bashoodToken.balanceOf(presaleAddr);
  const opsBalanceBefore3 = await bashoodToken.balanceOf(deployer.address);
  const treasuryBalanceBefore3 = await bashoodToken.balanceOf(treasuryWallet);
  const totalSupplyBefore3 = await bashoodToken.totalSupply();

  console.log(`\n📊 Balances ANTES de la compra:`);
  console.log(`  Alice:    ${ethers.formatUnits(aliceBalanceBefore3, 18)} BHT`);
  console.log(`  Presale:  ${ethers.formatUnits(presaleBalanceBefore3, 18)} BHT`);
  console.log(`  Ops:      ${ethers.formatUnits(opsBalanceBefore3, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalanceBefore3, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(totalSupplyBefore3, 18)} BHT`);

  const nonce = 4001;
  const signature = await signNonce(deployer, alice.address, nonce);
  
  console.log(`\n💸 Alice aprueba al presale...`);
  tx = await bashoodToken.connect(alice).approve(presaleAddr, ethers.parseUnits("1000000", 18));
  await tx.wait();

  console.log(`💸 Alice compra 1 NFT con BHT (25,000 BHT)...`);
  tx = await bashoodPresale.connect(alice).purchaseWithBHT(1, 1, nonce, signature);
  const receipt3 = await tx.wait();

  const aliceBalanceAfter3 = await bashoodToken.balanceOf(alice.address);
  const presaleBalanceAfter3 = await bashoodToken.balanceOf(presaleAddr);
  const opsBalanceAfter3 = await bashoodToken.balanceOf(deployer.address);
  const treasuryBalanceAfter3 = await bashoodToken.balanceOf(treasuryWallet);
  const totalSupplyAfter3 = await bashoodToken.totalSupply();
  const deadBalance3 = await bashoodToken.balanceOf("0x000000000000000000000000000000000000dEaD");

  console.log(`\n📊 Balances DESPUÉS de la compra:`);
  console.log(`  Alice:    ${ethers.formatUnits(aliceBalanceAfter3, 18)} BHT`);
  console.log(`  Presale:  ${ethers.formatUnits(presaleBalanceAfter3, 18)} BHT`);
  console.log(`  Ops:      ${ethers.formatUnits(opsBalanceAfter3, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBalanceAfter3, 18)} BHT`);
  console.log(`  Dead:     ${ethers.formatUnits(deadBalance3, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(totalSupplyAfter3, 18)} BHT`);

  const aliceSpent3 = aliceBalanceBefore3 - aliceBalanceAfter3;
  const presaleReceived3 = presaleBalanceAfter3 - presaleBalanceBefore3;
  const opsReceived3 = opsBalanceAfter3 - opsBalanceBefore3;
  const treasuryReceived3 = treasuryBalanceAfter3 - treasuryBalanceBefore3;
  const burned3 = totalSupplyBefore3 - totalSupplyAfter3;

  console.log(`\n📊 MOVIMIENTOS:`);
  console.log(`  Alice gastó:      ${ethers.formatUnits(aliceSpent3, 18)} BHT`);
  console.log(`  Presale recibió:  ${ethers.formatUnits(presaleReceived3, 18)} BHT`);
  console.log(`  Ops recibió:      ${ethers.formatUnits(opsReceived3, 18)} BHT`);
  console.log(`  Treasury recibió: ${ethers.formatUnits(treasuryReceived3, 18)} BHT`);
  console.log(`  Burned (supply):  ${ethers.formatUnits(burned3, 18)} BHT`);
  console.log(`  Dead wallet:      ${ethers.formatUnits(deadBalance3, 18)} BHT`);

  const burnPercent3 = (Number(burned3) * 100 / Number(aliceSpent3)).toFixed(4);
  const feePercent3 = (Number(treasuryReceived3) * 100 / Number(aliceSpent3)).toFixed(4);
  const opsPercent3 = (Number(opsReceived3) * 100 / Number(aliceSpent3)).toFixed(4);

  console.log(`\n📈 PORCENTAJES REALES:`);
  console.log(`  Burn:     ${burnPercent3}% (esperado: ${(Number(burnRate) / 100).toFixed(2)}%)`);
  console.log(`  Fee:      ${feePercent3}% (esperado: ${(Number(treasuryFee) / 100).toFixed(2)}%)`);
  console.log(`  Ops:      ${opsPercent3}%`);

  const presaleBurnWorks = burned3 > 0n || deadBalance3 > 0n;
  const presaleFeeWorks = treasuryReceived3 > 0n;
  
  console.log(`\n✓ Presale aplica burn: ${presaleBurnWorks ? '✅ SÍ' : '❌ NO'}`);
  console.log(`✓ Presale aplica fee:  ${presaleFeeWorks ? '✅ SÍ' : '❌ NO'}`);

  // ============================================
  // ANÁLISIS COMPARATIVO
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 ANÁLISIS COMPARATIVO");
  console.log("=".repeat(80));

  console.log(`\n🔍 Burn Rate:`);
  console.log(`  Transfer directo:    ${burnPercent1}%`);
  console.log(`  TransferFrom:        ${burnPercent2}%`);
  console.log(`  Presale purchase:    ${burnPercent3}%`);
  console.log(`  Consistente: ${burnPercent1 === burnPercent2 && burnPercent2 === burnPercent3 ? '✅ SÍ' : '❌ NO'}`);

  console.log(`\n🔍 Treasury Fee:`);
  console.log(`  Transfer directo:    ${feePercent1}%`);
  console.log(`  TransferFrom:        ${feePercent2}%`);
  console.log(`  Presale purchase:    ${feePercent3}%`);
  console.log(`  Consistente: ${feePercent1 === feePercent2 && feePercent2 === feePercent3 ? '✅ SÍ' : '❌ NO'}`);

  // ============================================
  // DIAGNÓSTICO FINAL
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔬 DIAGNÓSTICO FINAL");
  console.log("=".repeat(80));

  if (burnPercent3 === "0.0000" && feePercent3 === "0.0000") {
    console.log(`\n❌ PROBLEMA CONFIRMADO:`);
    console.log(`  El presale NO aplica burn ni fee del token BHT`);
    console.log(`  Posibles causas:`);
    console.log(`    1. Presale está en lista de exentos (whitelist)`);
    console.log(`    2. Error en la lógica de transferFrom() del token`);
    console.log(`    3. Transferencia directa bypassing transfer hooks`);
  } else if (parseFloat(burnPercent3) < parseFloat(burnPercent1) * 0.9) {
    console.log(`\n⚠️  DISCREPANCIA DETECTADA:`);
    console.log(`  El presale aplica burn/fee pero en menor proporción`);
    console.log(`  Transfer directo: ${burnPercent1}% burn, ${feePercent1}% fee`);
    console.log(`  Presale: ${burnPercent3}% burn, ${feePercent3}% fee`);
  } else {
    console.log(`\n✅ FUNCIONAMIENTO CORRECTO:`);
    console.log(`  El presale aplica burn y fee correctamente`);
    console.log(`  Burn: ${burnPercent3}% (esperado: ${(Number(burnRate) / 100).toFixed(2)}%)`);
    console.log(`  Fee: ${feePercent3}% (esperado: ${(Number(treasuryFee) / 100).toFixed(2)}%)`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ INVESTIGACIÓN COMPLETADA");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
