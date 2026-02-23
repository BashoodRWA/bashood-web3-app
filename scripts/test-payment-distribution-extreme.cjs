const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 TEST EXTREMO DE DISTRIBUCIÓN: Ballenas + Coherencia Total");
  console.log("=".repeat(80));

  const allSigners = await ethers.getSigners();
  const deployer = allSigners[0];
  
  // Wallets de distribución (separadas para evitar gas contamination)
  const developmentWallet = allSigners[10]; // 45%
  const operationsWallet = allSigners[11];   // 25%
  const marketingWallet = allSigners[12];    // 20%
  const treasuryWallet = allSigners[13];     // 10%

  console.log(`\n📋 Configuración de distribución:`);
  console.log(`  Development (45%): ${developmentWallet.address}`);
  console.log(`  Operations (25%):  ${operationsWallet.address}`);
  console.log(`  Marketing (20%):   ${marketingWallet.address}`);
  console.log(`  Treasury (10%):    ${treasuryWallet.address}`);

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

  // Deploy PaymentSplitter
  const payees = [
    developmentWallet.address,
    operationsWallet.address,
    marketingWallet.address,
    treasuryWallet.address
  ];
  
  const shares = [45, 25, 20, 10];
  
  const PaymentSplitter = await ethers.getContractFactory("contracts/BashoodPaymentSplitter.sol:BashoodPaymentSplitter");
  const paymentSplitter = await PaymentSplitter.deploy(payees, shares);
  await paymentSplitter.waitForDeployment();
  const splitterAddr = await paymentSplitter.getAddress();

  const currentBlock = await ethers.provider.getBlock('latest');
  const presaleStart = currentBlock.timestamp + 10;
  const presaleEnd = currentBlock.timestamp + (30 * 24 * 60 * 60);

  const BashoodPresale = await ethers.getContractFactory("BashoodPresaleFinal");
  const bashoodPresale = await BashoodPresale.deploy(
    tokenAddr, nftAddr, referralAddr, splitterAddr,
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
  tx = await bashoodPresale.setOperationsWallet(operationsWallet.address);
  await tx.wait();
  tx = await bashoodPresale.setSigner(deployer.address);
  await tx.wait();
  tx = await bashoodPresale.setMaxPriceStaleness(3600);
  await tx.wait();
  tx = await bashoodPresale.setMaxPerUser(2000); // Permitir compras grandes
  await tx.wait();
  tx = await bashoodPresale.startPresale();
  await tx.wait();
  await ethers.provider.send("evm_increaseTime", [15]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✅ Configuración completa`);

  // ============================================
  // CAPTURAR BALANCES INICIALES
  // ============================================
  const devBalanceBefore = await ethers.provider.getBalance(developmentWallet.address);
  const opsBalanceBefore = await ethers.provider.getBalance(operationsWallet.address);
  const mktBalanceBefore = await ethers.provider.getBalance(marketingWallet.address);
  const treBalanceBefore = await ethers.provider.getBalance(treasuryWallet.address);

  console.log(`\n📊 Balances iniciales:`);
  console.log(`  Development: ${ethers.formatEther(devBalanceBefore)} ETH`);
  console.log(`  Operations:  ${ethers.formatEther(opsBalanceBefore)} ETH`);
  console.log(`  Marketing:   ${ethers.formatEther(mktBalanceBefore)} ETH`);
  console.log(`  Treasury:    ${ethers.formatEther(treBalanceBefore)} ETH`);

  // ============================================
  // SIMULAR COMPRAS MASIVAS
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🐋 SIMULANDO COMPRAS MASIVAS (3 Ballenas)");
  console.log("=".repeat(80));

  const buyers = allSigners.slice(4, 10);
  let totalETHReceived = 0n;
  let nonce = 5000;

  // Ballena 1: 500 NFTs (50 ETH)
  console.log(`\n🐋 Ballena #1: 500 NFTs (50 ETH)`);
  const qty1 = 500;
  const sig1 = await signNonce(deployer, buyers[0].address, nonce++);
  const eth1 = ethers.parseEther("0.1") * BigInt(qty1);
  
  const start1 = Date.now();
  tx = await bashoodPresale.connect(buyers[0]).purchaseWithETH(
    1, qty1, nonce - 1, sig1, { value: eth1 }
  );
  await tx.wait();
  const time1 = Date.now() - start1;
  totalETHReceived += eth1;
  console.log(`   ✅ ${time1}ms | 50 ETH enviado`);

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  let block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Ballena 2: 1000 NFTs (100 ETH)
  console.log(`\n🐋 Ballena #2: 1000 NFTs (100 ETH)`);
  const qty2 = 1000;
  const sig2 = await signNonce(deployer, buyers[1].address, nonce++);
  const eth2 = ethers.parseEther("0.1") * BigInt(qty2);
  
  const start2 = Date.now();
  tx = await bashoodPresale.connect(buyers[1]).purchaseWithETH(
    1, qty2, nonce - 1, sig2, { value: eth2 }
  );
  await tx.wait();
  const time2 = Date.now() - start2;
  totalETHReceived += eth2;
  console.log(`   ✅ ${time2}ms | 100 ETH enviado`);

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Ballena 3: 1500 NFTs (150 ETH)
  console.log(`\n🐋 Ballena #3: 1500 NFTs (150 ETH)`);
  const qty3 = 1500;
  const sig3 = await signNonce(deployer, buyers[2].address, nonce++);
  const eth3 = ethers.parseEther("0.1") * BigInt(qty3);
  
  const start3 = Date.now();
  tx = await bashoodPresale.connect(buyers[2]).purchaseWithETH(
    1, qty3, nonce - 1, sig3, { value: eth3 }
  );
  await tx.wait();
  const time3 = Date.now() - start3;
  totalETHReceived += eth3;
  console.log(`   ✅ ${time3}ms | 150 ETH enviado`);

  console.log(`\n💰 Total recaudado: ${ethers.formatEther(totalETHReceived)} ETH en 3 compras`);
  console.log(`   Promedio de tiempo: ${Math.round((time1 + time2 + time3) / 3)}ms`);

  // ============================================
  // TRANSFERIR FONDOS AL SPLITTER
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔄 TRANSFIRIENDO FONDOS AL PaymentSplitter");
  console.log("=".repeat(80));

  const pendingAmount = await bashoodPresale.pendingWithdrawals(splitterAddr);
  console.log(`\n📊 Fondos pendientes: ${ethers.formatEther(pendingAmount)} ETH`);
  
  // Simular transferencia (en producción el splitter llamaría claimProjectFunds)
  tx = await deployer.sendTransaction({
    to: splitterAddr,
    value: totalETHReceived
  });
  await tx.wait();

  const splitterBalance = await ethers.provider.getBalance(splitterAddr);
  console.log(`✅ PaymentSplitter balance: ${ethers.formatEther(splitterBalance)} ETH`);

  // ============================================
  // LIBERAR FONDOS
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔓 DISTRIBUYENDO FONDOS");
  console.log("=".repeat(80));

  console.log(`\n💸 Liberando fondos...`);
  
  tx = await paymentSplitter.release(developmentWallet.address);
  await tx.wait();
  console.log(`   ✅ Development`);

  tx = await paymentSplitter.release(operationsWallet.address);
  await tx.wait();
  console.log(`   ✅ Operations`);

  tx = await paymentSplitter.release(marketingWallet.address);
  await tx.wait();
  console.log(`   ✅ Marketing`);

  tx = await paymentSplitter.release(treasuryWallet.address);
  await tx.wait();
  console.log(`   ✅ Treasury`);

  // ============================================
  // VALIDACIÓN EXTREMA
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔍 VALIDACIÓN DE COHERENCIA EXTREMA");
  console.log("=".repeat(80));

  const devBalanceAfter = await ethers.provider.getBalance(developmentWallet.address);
  const opsBalanceAfter = await ethers.provider.getBalance(operationsWallet.address);
  const mktBalanceAfter = await ethers.provider.getBalance(marketingWallet.address);
  const treBalanceAfter = await ethers.provider.getBalance(treasuryWallet.address);
  const splitterBalanceFinal = await ethers.provider.getBalance(splitterAddr);

  const devReceived = devBalanceAfter - devBalanceBefore;
  const opsReceived = opsBalanceAfter - opsBalanceBefore;
  const mktReceived = mktBalanceAfter - mktBalanceBefore;
  const treReceived = treBalanceAfter - treBalanceBefore;

  console.log(`\n💰 Fondos recibidos:`);
  console.log(`  Development: ${ethers.formatEther(devReceived)} ETH`);
  console.log(`  Operations:  ${ethers.formatEther(opsReceived)} ETH`);
  console.log(`  Marketing:   ${ethers.formatEther(mktReceived)} ETH`);
  console.log(`  Treasury:    ${ethers.formatEther(treReceived)} ETH`);

  // Calcular esperados
  const expectedDev = (totalETHReceived * 45n) / 100n;
  const expectedOps = (totalETHReceived * 25n) / 100n;
  const expectedMkt = (totalETHReceived * 20n) / 100n;
  const expectedTre = (totalETHReceived * 10n) / 100n;

  console.log(`\n📊 Validación de proporciones:`);
  
  const devMatch = devReceived === expectedDev;
  const devDiff = devReceived - expectedDev;
  console.log(`  Development: ${ethers.formatEther(expectedDev)} ETH ${devMatch ? '✅' : `❌ (diff: ${ethers.formatEther(devDiff)})`}`);
  
  const opsMatch = opsReceived === expectedOps;
  const opsDiff = opsReceived - expectedOps;
  console.log(`  Operations:  ${ethers.formatEther(expectedOps)} ETH ${opsMatch ? '✅' : `❌ (diff: ${ethers.formatEther(opsDiff)})`}`);
  
  const mktMatch = mktReceived === expectedMkt;
  const mktDiff = mktReceived - expectedMkt;
  console.log(`  Marketing:   ${ethers.formatEther(expectedMkt)} ETH ${mktMatch ? '✅' : `❌ (diff: ${ethers.formatEther(mktDiff)})`}`);
  
  const treMatch = treReceived === expectedTre;
  const treDiff = treReceived - expectedTre;
  console.log(`  Treasury:    ${ethers.formatEther(expectedTre)} ETH ${treMatch ? '✅' : `❌ (diff: ${ethers.formatEther(treDiff)})`}`);

  // Verificación de suma total
  const totalDistributed = devReceived + opsReceived + mktReceived + treReceived;
  const sumMatch = totalDistributed === totalETHReceived;

  console.log(`\n🔍 Verificación de coherencia total:`);
  console.log(`  Total recaudado:    ${ethers.formatEther(totalETHReceived)} ETH`);
  console.log(`  Total distribuido:  ${ethers.formatEther(totalDistributed)} ETH`);
  console.log(`  Diferencia:         ${ethers.formatEther(totalDistributed - totalETHReceived)} ETH`);
  console.log(`  Balance splitter:   ${ethers.formatEther(splitterBalanceFinal)} ETH`);
  console.log(`  Coherencia suma: ${sumMatch ? '✅ PERFECTO' : '❌ ERROR'}`);
  console.log(`  Splitter vacío:  ${splitterBalanceFinal === 0n ? '✅ CORRECTO' : '❌ ERROR'}`);

  // Cálculo de porcentajes reales
  if (totalDistributed > 0n) {
    const devPercent = (Number(devReceived) * 100 / Number(totalDistributed)).toFixed(4);
    const opsPercent = (Number(opsReceived) * 100 / Number(totalDistributed)).toFixed(4);
    const mktPercent = (Number(mktReceived) * 100 / Number(totalDistributed)).toFixed(4);
    const trePercent = (Number(treReceived) * 100 / Number(totalDistributed)).toFixed(4);

    console.log(`\n📈 Porcentajes reales (4 decimales):`);
    console.log(`  Development: ${devPercent}% (esperado: 45.0000%)`);
    console.log(`  Operations:  ${opsPercent}% (esperado: 25.0000%)`);
    console.log(`  Marketing:   ${mktPercent}% (esperado: 20.0000%)`);
    console.log(`  Treasury:    ${trePercent}% (esperado: 10.0000%)`);

    const percentSum = parseFloat(devPercent) + parseFloat(opsPercent) + parseFloat(mktPercent) + parseFloat(trePercent);
    console.log(`  Suma total:  ${percentSum.toFixed(4)}% (esperado: 100.0000%)`);
  }

  // Resultado final
  const allMatch = devMatch && opsMatch && mktMatch && treMatch && sumMatch && splitterBalanceFinal === 0n;
  
  console.log("\n" + "=".repeat(80));
  if (allMatch) {
    console.log("✅ RESULTADO FINAL: DISTRIBUCIÓN PERFECTA");
    console.log(`   - ${ethers.formatEther(totalETHReceived)} ETH distribuido correctamente`);
    console.log(`   - Proporciones exactas: 45/25/20/10`);
    console.log(`   - Coherencia matemática: 100%`);
    console.log(`   - PaymentSplitter: operativo y preciso`);
  } else {
    console.log("❌ RESULTADO FINAL: ERROR EN DISTRIBUCIÓN");
  }
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
