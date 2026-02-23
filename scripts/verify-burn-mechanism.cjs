const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 VERIFICACIÓN DETALLADA: BHT Burn Mechanism");
  console.log("=".repeat(80));

  const [deployer, buyer] = await ethers.getSigners();

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
  tx = await bashoodToken.transfer(buyer.address, ethers.parseUnits("100000000", 18));
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
  // OBTENER PARÁMETROS DEL PRESALE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 PARÁMETROS DEL PRESALE");
  console.log("=".repeat(80));

  const burnBps = await bashoodPresale.burnBps();
  const bhtDiscountBps = await bashoodPresale.bhtDiscountBps();
  const nftPriceBHT = await bashoodPresale.nftPriceBHT();

  console.log(`\n  Precio base NFT: ${ethers.formatUnits(nftPriceBHT, 18)} BHT`);
  console.log(`  BHT discount: ${bhtDiscountBps} bps (${(Number(bhtDiscountBps) / 100).toFixed(2)}%)`);
  console.log(`  Burn rate: ${burnBps} bps (${(Number(burnBps) / 100).toFixed(2)}%)`);

  // Calcular precio final
  const MAX_BPS = 10000n;
  const baseCost = nftPriceBHT;
  const discountedCost = (baseCost * (MAX_BPS - bhtDiscountBps)) / MAX_BPS;
  const burnAmount = (discountedCost * burnBps) / MAX_BPS;
  const opsAmount = discountedCost - burnAmount;

  console.log(`\n  Cálculo para 1 NFT:`);
  console.log(`    Base cost:       ${ethers.formatUnits(baseCost, 18)} BHT`);
  console.log(`    Discounted cost: ${ethers.formatUnits(discountedCost, 18)} BHT`);
  console.log(`    Burn amount:     ${ethers.formatUnits(burnAmount, 18)} BHT`);
  console.log(`    Ops amount:      ${ethers.formatUnits(opsAmount, 18)} BHT`);
  console.log(`    Total deducido:  ${ethers.formatUnits(discountedCost, 18)} BHT`);

  // ============================================
  // COMPRA REAL CON BHT
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("💰 COMPRA REAL CON BHT (1 NFT)");
  console.log("=".repeat(80));

  const buyerBalanceBefore = await bashoodToken.balanceOf(buyer.address);
  const opsBalanceBefore = await bashoodToken.balanceOf(deployer.address);
  const deadBalanceBefore = await bashoodToken.balanceOf("0x000000000000000000000000000000000000dEaD");

  console.log(`\n📊 Balances ANTES:`);
  console.log(`  Buyer:    ${ethers.formatUnits(buyerBalanceBefore, 18)} BHT`);
  console.log(`  Ops:      ${ethers.formatUnits(opsBalanceBefore, 18)} BHT`);
  console.log(`  Dead:     ${ethers.formatUnits(deadBalanceBefore, 18)} BHT`);

  const nonce = 3001;
  const signature = await signNonce(deployer, buyer.address, nonce);
  
  tx = await bashoodToken.connect(buyer).approve(presaleAddr, ethers.parseUnits("1000000", 18));
  await tx.wait();
  
  tx = await bashoodPresale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
  const receipt = await tx.wait();

  // Buscar eventos
  console.log(`\n📝 Eventos emitidos:`);
  for (const log of receipt.logs) {
    try {
      const parsedLog = bashoodPresale.interface.parseLog(log);
      if (parsedLog && parsedLog.name === "Burned") {
        console.log(`  ✅ Burned: ${ethers.formatUnits(parsedLog.args[1], 18)} BHT`);
      } else if (parsedLog && parsedLog.name === "AssetPurchased") {
        console.log(`  ✅ AssetPurchased: ${parsedLog.args[2]} NFTs`);
      }
    } catch {}
  }

  const buyerBalanceAfter = await bashoodToken.balanceOf(buyer.address);
  const opsBalanceAfter = await bashoodToken.balanceOf(deployer.address);
  const deadBalanceAfter = await bashoodToken.balanceOf("0x000000000000000000000000000000000000dEaD");

  console.log(`\n📊 Balances DESPUÉS:`);
  console.log(`  Buyer:    ${ethers.formatUnits(buyerBalanceAfter, 18)} BHT`);
  console.log(`  Ops:      ${ethers.formatUnits(opsBalanceAfter, 18)} BHT`);
  console.log(`  Dead:     ${ethers.formatUnits(deadBalanceAfter, 18)} BHT`);

  const buyerSpent = buyerBalanceBefore - buyerBalanceAfter;
  const opsReceived = opsBalanceAfter - opsBalanceBefore;
  const deadReceived = deadBalanceAfter - deadBalanceBefore;

  console.log(`\n📊 MOVIMIENTOS:`);
  console.log(`  Buyer gastó:  ${ethers.formatUnits(buyerSpent, 18)} BHT`);
  console.log(`  Ops recibió:  ${ethers.formatUnits(opsReceived, 18)} BHT`);
  console.log(`  Dead recibió: ${ethers.formatUnits(deadReceived, 18)} BHT`);

  // ============================================
  // VALIDACIÓN
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔍 VALIDACIÓN DE BURN");
  console.log("=".repeat(80));

  const burnExpected = burnAmount;
  const opsExpected = opsAmount;
  const totalExpected = discountedCost;

  console.log(`\n✓ Validando burn:`);
  const burnMatch = deadReceived === burnExpected;
  console.log(`  Esperado: ${ethers.formatUnits(burnExpected, 18)} BHT`);
  console.log(`  Real:     ${ethers.formatUnits(deadReceived, 18)} BHT`);
  console.log(`  ${burnMatch ? '✅ CORRECTO' : '❌ ERROR'}`);

  console.log(`\n✓ Validando ops:`);
  const opsMatch = opsReceived === opsExpected;
  console.log(`  Esperado: ${ethers.formatUnits(opsExpected, 18)} BHT`);
  console.log(`  Real:     ${ethers.formatUnits(opsReceived, 18)} BHT`);
  console.log(`  ${opsMatch ? '✅ CORRECTO' : '❌ ERROR'}`);

  console.log(`\n✓ Validando total gastado:`);
  const totalMatch = buyerSpent === totalExpected;
  console.log(`  Esperado: ${ethers.formatUnits(totalExpected, 18)} BHT`);
  console.log(`  Real:     ${ethers.formatUnits(buyerSpent, 18)} BHT`);
  console.log(`  ${totalMatch ? '✅ CORRECTO' : '❌ ERROR'}`);

  console.log(`\n✓ Validando suma (burn + ops = total):`);
  const sumMatch = (deadReceived + opsReceived) === buyerSpent;
  console.log(`  Burn + Ops: ${ethers.formatUnits(deadReceived + opsReceived, 18)} BHT`);
  console.log(`  Total:      ${ethers.formatUnits(buyerSpent, 18)} BHT`);
  console.log(`  ${sumMatch ? '✅ CORRECTO' : '❌ ERROR'}`);

  // ============================================
  // VERIFICACIÓN: BHT TOKEN BURN/FEE
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔍 VERIFICACIÓN: BHT Token Burn/Fee (3% + 2%)");
  console.log("=".repeat(80));

  console.log(`\nℹ️  El BHT token tiene:`);
  console.log(`  - 3% burn en cada transferencia`);
  console.log(`  - 2% fee a operationsWallet`);
  
  console.log(`\nℹ️  En purchaseWithBHT():`);
  console.log(`  - El presale usa transferFrom() directamente`);
  console.log(`  - El burn del token NO se aplica (evita doble burn)`);
  console.log(`  - El presale calcula su propio burn (${(Number(burnBps) / 100).toFixed(2)}%)`);

  const tokenBurnRate = 300; // 3%
  const tokenFeeRate = 200;  // 2%
  const wouldBeBurned = (buyerSpent * BigInt(tokenBurnRate)) / 10000n;
  const wouldBeFee = (buyerSpent * BigInt(tokenFeeRate)) / 10000n;

  console.log(`\n📊 Si el burn del token se aplicara (NO debería):`);
  console.log(`  Burn adicional: ${ethers.formatUnits(wouldBeBurned, 18)} BHT (3%)`);
  console.log(`  Fee adicional:  ${ethers.formatUnits(wouldBeFee, 18)} BHT (2%)`);
  console.log(`  Total extra:    ${ethers.formatUnits(wouldBeBurned + wouldBeFee, 18)} BHT`);

  console.log(`\n✅ CONCLUSIÓN:`);
  console.log(`  El presale usa transferFrom() para evitar el burn/fee del token`);
  console.log(`  Esto es CORRECTO porque el presale implementa su propio burn`);
  console.log(`  Sin esto, habría doble burn (token 3% + presale ${(Number(burnBps) / 100).toFixed(2)}%)`);

  // ============================================
  // RESULTADO FINAL
  // ============================================
  const allCorrect = burnMatch && opsMatch && totalMatch && sumMatch;

  console.log("\n" + "=".repeat(80));
  if (allCorrect) {
    console.log("✅ BURN MECHANISM: FUNCIONANDO CORRECTAMENTE");
    console.log(`   - Burn aplicado: ${ethers.formatUnits(deadReceived, 18)} BHT`);
    console.log(`   - Ops recibido: ${ethers.formatUnits(opsReceived, 18)} BHT`);
    console.log(`   - Total coherente: ${ethers.formatUnits(buyerSpent, 18)} BHT`);
  } else {
    console.log("❌ ERROR EN BURN MECHANISM");
  }
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
