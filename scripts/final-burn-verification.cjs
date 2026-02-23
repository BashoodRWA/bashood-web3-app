const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICACIÓN FINAL: Wallets Separadas");
  console.log("=".repeat(80));

  const allSigners = await ethers.getSigners();
  const deployer = allSigners[0];
  const treasuryWallet = allSigners[1];  // Wallet DIFERENTE para treasury
  const opsWallet = allSigners[2];       // Wallet DIFERENTE para ops
  const buyer = allSigners[3];

  console.log(`\n📋 Configuración:`);
  console.log(`  Deployer:  ${deployer.address}`);
  console.log(`  Treasury:  ${treasuryWallet.address}`);
  console.log(`  Ops:       ${opsWallet.address}`);
  console.log(`  Buyer:     ${buyer.address}`);

  // ============================================
  // DEPLOYMENT
  // ============================================
  console.log(`\n📦 Desplegando contratos...`);
  
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = await BashoodToken.deploy(treasuryWallet.address); // Treasury SEPARADA
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
  tx = await bashoodToken.transfer(buyer.address, ethers.parseUnits("100000", 18));
  await tx.wait();
  tx = await mockNFT.mint(presaleAddr, 1, 10000);
  await tx.wait();
  tx = await bashoodPresale.setPriceFeed(priceFeedAddr);
  await tx.wait();
  tx = await bashoodPresale.setOperationsWallet(opsWallet.address); // OPS SEPARADA
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
  // BALANCES INICIALES
  // ============================================
  const buyerBefore = await bashoodToken.balanceOf(buyer.address);
  const treasuryBefore = await bashoodToken.balanceOf(treasuryWallet.address);
  const opsBefore = await bashoodToken.balanceOf(opsWallet.address);
  const presaleBefore = await bashoodToken.balanceOf(presaleAddr);
  const supplyBefore = await bashoodToken.totalSupply();

  console.log(`\n📊 Balances ANTES de la compra:`);
  console.log(`  Buyer:    ${ethers.formatUnits(buyerBefore, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryBefore, 18)} BHT`);
  console.log(`  Ops:      ${ethers.formatUnits(opsBefore, 18)} BHT`);
  console.log(`  Presale:  ${ethers.formatUnits(presaleBefore, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(supplyBefore, 18)} BHT`);

  // ============================================
  // COMPRA CON BHT
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("💰 COMPRANDO 1 NFT CON BHT");
  console.log("=".repeat(80));

  const nonce = 5001;
  const signature = await signNonce(deployer, buyer.address, nonce);
  
  tx = await bashoodToken.connect(buyer).approve(presaleAddr, ethers.parseUnits("100000", 18));
  await tx.wait();
  
  console.log(`\n💸 Buyer compra 1 NFT con 25,000 BHT...`);
  tx = await bashoodPresale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
  await tx.wait();

  // ============================================
  // BALANCES FINALES
  // ============================================
  const buyerAfter = await bashoodToken.balanceOf(buyer.address);
  const treasuryAfter = await bashoodToken.balanceOf(treasuryWallet.address);
  const opsAfter = await bashoodToken.balanceOf(opsWallet.address);
  const presaleAfter = await bashoodToken.balanceOf(presaleAddr);
  const supplyAfter = await bashoodToken.totalSupply();
  const deadBalance = await bashoodToken.balanceOf("0x000000000000000000000000000000000000dEaD");

  console.log(`\n📊 Balances DESPUÉS de la compra:`);
  console.log(`  Buyer:    ${ethers.formatUnits(buyerAfter, 18)} BHT`);
  console.log(`  Treasury: ${ethers.formatUnits(treasuryAfter, 18)} BHT`);
  console.log(`  Ops:      ${ethers.formatUnits(opsAfter, 18)} BHT`);
  console.log(`  Presale:  ${ethers.formatUnits(presaleAfter, 18)} BHT`);
  console.log(`  Dead:     ${ethers.formatUnits(deadBalance, 18)} BHT`);
  console.log(`  Supply:   ${ethers.formatUnits(supplyAfter, 18)} BHT`);

  // ============================================
  // ANÁLISIS DETALLADO
  // ============================================
  const buyerSpent = buyerBefore - buyerAfter;
  const treasuryReceived = treasuryAfter - treasuryBefore;
  const opsReceived = opsAfter - opsBefore;
  const presaleReceived = presaleAfter - presaleBefore;
  const burned = supplyBefore - supplyAfter;

  console.log("\n" + "=".repeat(80));
  console.log("📊 MOVIMIENTOS DETALLADOS");
  console.log("=".repeat(80));

  console.log(`\n💸 FLUJO DE FONDOS:`);
  console.log(`  Buyer gastó:           ${ethers.formatUnits(buyerSpent, 18)} BHT`);
  console.log(`  Treasury recibió:      ${ethers.formatUnits(treasuryReceived, 18)} BHT`);
  console.log(`  Ops recibió:           ${ethers.formatUnits(opsReceived, 18)} BHT`);
  console.log(`  Presale recibió:       ${ethers.formatUnits(presaleReceived, 18)} BHT`);
  console.log(`  Burned (supply):       ${ethers.formatUnits(burned, 18)} BHT`);
  console.log(`  Dead wallet:           ${ethers.formatUnits(deadBalance, 18)} BHT`);

  // Validación de suma
  const totalOut = treasuryReceived + opsReceived + presaleReceived + burned;
  const sumMatch = totalOut === buyerSpent;

  console.log(`\n🔍 VALIDACIÓN:`);
  console.log(`  Total salidas: ${ethers.formatUnits(totalOut, 18)} BHT`);
  console.log(`  Total gastado: ${ethers.formatUnits(buyerSpent, 18)} BHT`);
  console.log(`  Balance: ${sumMatch ? '✅ CORRECTO' : '❌ ERROR'}`);

  // Calcular porcentajes
  const burnPercent = (Number(burned) * 100 / Number(buyerSpent)).toFixed(4);
  const treasuryPercent = (Number(treasuryReceived) * 100 / Number(buyerSpent)).toFixed(4);
  const opsPercent = (Number(opsReceived) * 100 / Number(buyerSpent)).toFixed(4);

  console.log(`\n📈 PORCENTAJES:`);
  console.log(`  Burn:     ${burnPercent}% (esperado: 0.10%)`);
  console.log(`  Treasury: ${treasuryPercent}% (esperado: 0.50%)`);
  console.log(`  Ops:      ${opsPercent}% (esperado: ~99.4%)`);

  // ============================================
  // DIAGNÓSTICO FINAL
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔬 DIAGNÓSTICO FINAL");
  console.log("=".repeat(80));

  const burnOK = Math.abs(parseFloat(burnPercent) - 0.10) < 0.01;
  const treasuryOK = Math.abs(parseFloat(treasuryPercent) - 0.50) < 0.01;

  if (burnOK && treasuryOK) {
    console.log(`\n✅ FUNCIONAMIENTO CORRECTO`);
    console.log(`  ✅ Burn del 0.1% aplicado correctamente`);
    console.log(`  ✅ Treasury fee del 0.5% aplicado correctamente`);
    console.log(`  ✅ Ops recibe el BHT del presale (${opsPercent}%)`);
    console.log(`\n📝 CONCLUSIÓN:`);
    console.log(`  El presale NO está exento de burn/fee del token`);
    console.log(`  El token BHT aplica su burn (0.1%) y fee (0.5%) normalmente`);
    console.log(`  Ops wallet recibe ~24,850 BHT después de deducir burn/fee del token`);
  } else {
    console.log(`\n⚠️  PROBLEMA DETECTADO`);
    console.log(`  Burn: ${burnPercent}% (esperado: 0.10%) ${burnOK ? '✅' : '❌'}`);
    console.log(`  Treasury: ${treasuryPercent}% (esperado: 0.50%) ${treasuryOK ? '✅' : '❌'}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICACIÓN COMPLETADA");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
