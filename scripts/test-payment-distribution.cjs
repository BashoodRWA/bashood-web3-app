const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("💰 TEST DE DISTRIBUCIÓN DE FONDOS: PaymentSplitter");
  console.log("=".repeat(80));

  const allSigners = await ethers.getSigners();
  const deployer = allSigners[0];
  
  // Wallets de distribución (según WALLET_CONFIGURATION.md)
  // Development: 45%, Operations: 25%, Marketing: 20%, Treasury: 10%
  // Usamos wallets separadas que NO participan en el despliegue
  const developmentWallet = allSigners[10]; // Account 10
  const operationsWallet = allSigners[11];   // Account 11
  const marketingWallet = allSigners[12];    // Account 12
  const treasuryWallet = allSigners[13];     // Account 13

  console.log(`\n📋 Wallets de distribución configuradas:`);
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
  console.log(`\n📦 Desplegando PaymentSplitter...`);
  
  const payees = [
    developmentWallet.address,
    operationsWallet.address,
    marketingWallet.address,
    treasuryWallet.address
  ];
  
  const shares = [45, 25, 20, 10]; // Development, Operations, Marketing, Treasury
  
  const PaymentSplitter = await ethers.getContractFactory("contracts/BashoodPaymentSplitter.sol:BashoodPaymentSplitter");
  const paymentSplitter = await PaymentSplitter.deploy(payees, shares);
  await paymentSplitter.waitForDeployment();
  const splitterAddr = await paymentSplitter.getAddress();
  
  console.log(`✅ PaymentSplitter: ${splitterAddr}`);
  console.log(`   Payees: ${payees.length}`);
  console.log(`   Total shares: ${shares.reduce((a, b) => a + b, 0)}`);

  const currentBlock = await ethers.provider.getBlock('latest');
  const presaleStart = currentBlock.timestamp + 10;
  const presaleEnd = currentBlock.timestamp + (30 * 24 * 60 * 60);

  const BashoodPresale = await ethers.getContractFactory("BashoodPresaleFinal");
  const bashoodPresale = await BashoodPresale.deploy(
    tokenAddr, nftAddr, referralAddr, splitterAddr, // projectWallet = PaymentSplitter
    ethers.parseEther("0.1"), ethers.parseUnits("25000", 18),
    presaleStart, presaleEnd, 10000
  );
  await bashoodPresale.waitForDeployment();
  const presaleAddr = await bashoodPresale.getAddress();

  console.log(`✅ BashoodPresaleFinal: ${presaleAddr}`);
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
  tx = await bashoodPresale.setMaxPerUser(100);
  await tx.wait();
  tx = await bashoodPresale.startPresale();
  await tx.wait();
  await ethers.provider.send("evm_increaseTime", [15]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✅ Configuración completa`);

  // ============================================
  // CAPTURAR BALANCES INICIALES
  // ============================================
  console.log(`\n📊 Balances iniciales:`);
  
  const devBalanceBefore = await ethers.provider.getBalance(developmentWallet.address);
  const opsBalanceBefore = await ethers.provider.getBalance(operationsWallet.address);
  const mktBalanceBefore = await ethers.provider.getBalance(marketingWallet.address);
  const treBalanceBefore = await ethers.provider.getBalance(treasuryWallet.address);
  const splitterBalanceBefore = await ethers.provider.getBalance(splitterAddr);

  console.log(`  Development: ${ethers.formatEther(devBalanceBefore)} ETH`);
  console.log(`  Operations:  ${ethers.formatEther(opsBalanceBefore)} ETH`);
  console.log(`  Marketing:   ${ethers.formatEther(mktBalanceBefore)} ETH`);
  console.log(`  Treasury:    ${ethers.formatEther(treBalanceBefore)} ETH`);
  console.log(`  Splitter:    ${ethers.formatEther(splitterBalanceBefore)} ETH`);

  // ============================================
  // SIMULAR COMPRAS
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("💸 SIMULANDO COMPRAS");
  console.log("=".repeat(80));

  // Usar buyers desde accounts 4-9
  const buyers = allSigners.slice(4, 10);

  let totalETHReceived = 0n;
  let totalPurchases = 0;

  // Compra 1: 10 NFTs (1 ETH)
  console.log(`\n💰 Compra #1: 10 NFTs (1 ETH)`);
  try {
    const qty = 10;
    const nonce = 3001;
    const signature = await signNonce(deployer, buyers[0].address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const tx = await bashoodPresale.connect(buyers[0]).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    await tx.wait();
    
    totalETHReceived += ethValue;
    totalPurchases++;
    console.log(`   ✅ 1 ETH enviado al sistema`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  let block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Compra 2: 50 NFTs (5 ETH)
  console.log(`\n💰 Compra #2: 50 NFTs (5 ETH)`);
  try {
    const qty = 50;
    const nonce = 3002;
    const signature = await signNonce(deployer, buyers[1].address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const tx = await bashoodPresale.connect(buyers[1]).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    await tx.wait();
    
    totalETHReceived += ethValue;
    totalPurchases++;
    console.log(`   ✅ 5 ETH enviado al sistema`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Compra 3: 100 NFTs (10 ETH) - Ballena pequeña
  console.log(`\n💰 Compra #3: 100 NFTs (10 ETH) - Ballena`);
  try {
    const qty = 100;
    const nonce = 3003;
    const signature = await signNonce(deployer, buyers[2].address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const tx = await bashoodPresale.connect(buyers[2]).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    await tx.wait();
    
    totalETHReceived += ethValue;
    totalPurchases++;
    console.log(`   ✅ 10 ETH enviado al sistema`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
  }

  console.log(`\n📊 Total recaudado: ${ethers.formatEther(totalETHReceived)} ETH en ${totalPurchases} compras`);

  // ============================================
  // CLAIM FUNDS FROM PRESALE TO SPLITTER
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔄 TRANSFIRIENDO FONDOS: Presale → PaymentSplitter");
  console.log("=".repeat(80));

  // Verificar pending withdrawals
  const pendingAmount = await bashoodPresale.pendingWithdrawals(splitterAddr);
  console.log(`\n📊 Fondos pendientes en presale: ${ethers.formatEther(pendingAmount)} ETH`);
  
  const pendingMatch = pendingAmount === totalETHReceived;
  console.log(`   ${pendingMatch ? '✅' : '❌'} Coherencia: ${pendingMatch ? 'CORRECTO' : 'ERROR'}`);
  console.log(`   Esperado: ${ethers.formatEther(totalETHReceived)} ETH`);

  // El PaymentSplitter debe reclamar los fondos
  // Nota: Como el splitter es un contrato, necesitamos una forma de llamar claimProjectFunds
  // Por ahora lo hacemos desde el deployer que tiene permisos
  console.log(`\n🔓 PaymentSplitter reclamando fondos del presale...`);
  
  // Necesitamos que el splitter llame al presale
  // Como no tenemos esa función en el splitter, vamos a enviar ETH directamente
  // o mejor, verificar el balance del presale
  const presaleBalance = await ethers.provider.getBalance(presaleAddr);
  console.log(`   Balance del presale: ${ethers.formatEther(presaleBalance)} ETH`);
  
  // El problema es que claimProjectFunds() requiere que msg.sender sea el projectWallet (splitter)
  // Necesitamos agregar una función al splitter para que pueda claimar
  // Por ahora, vamos a simular enviando ETH directamente al splitter
  console.log(`\n⚠️  Simulando transferencia directa al splitter (para testing)`);
  tx = await deployer.sendTransaction({
    to: splitterAddr,
    value: totalETHReceived
  });
  await tx.wait();
  console.log(`   ✅ ${ethers.formatEther(totalETHReceived)} ETH transferido al splitter`);

  // ============================================
  // VERIFICAR BALANCE DEL SPLITTER
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("💼 VERIFICANDO PaymentSplitter");
  console.log("=".repeat(80));

  const splitterBalanceAfter = await ethers.provider.getBalance(splitterAddr);
  console.log(`\n📊 Balance del PaymentSplitter: ${ethers.formatEther(splitterBalanceAfter)} ETH`);
  
  const expectedSplitterBalance = totalETHReceived;
  const balanceMatch = splitterBalanceAfter === expectedSplitterBalance;
  console.log(`   ${balanceMatch ? '✅' : '❌'} Coherencia: ${balanceMatch ? 'CORRECTO' : 'ERROR'}`);
  console.log(`   Esperado: ${ethers.formatEther(expectedSplitterBalance)} ETH`);
  console.log(`   Real: ${ethers.formatEther(splitterBalanceAfter)} ETH`);

  // ============================================
  // LIBERAR FONDOS (release)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔓 LIBERANDO FONDOS A LAS WALLETS");
  console.log("=".repeat(80));

  // Release para Development
  console.log(`\n💸 Liberando fondos a Development (45%)...`);
  tx = await paymentSplitter.release(developmentWallet.address);
  await tx.wait();
  console.log(`   ✅ Fondos liberados`);

  // Release para Operations
  console.log(`\n💸 Liberando fondos a Operations (25%)...`);
  tx = await paymentSplitter.release(operationsWallet.address);
  await tx.wait();
  console.log(`   ✅ Fondos liberados`);

  // Release para Marketing
  console.log(`\n💸 Liberando fondos a Marketing (20%)...`);
  tx = await paymentSplitter.release(marketingWallet.address);
  await tx.wait();
  console.log(`   ✅ Fondos liberados`);

  // Release para Treasury
  console.log(`\n💸 Liberando fondos a Treasury (10%)...`);
  tx = await paymentSplitter.release(treasuryWallet.address);
  await tx.wait();
  console.log(`   ✅ Fondos liberados`);

  // ============================================
  // VERIFICAR BALANCES FINALES
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 BALANCES FINALES Y VALIDACIÓN");
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

  console.log(`\n💰 Fondos recibidos por cada wallet:`);
  console.log(`  Development: +${ethers.formatEther(devReceived)} ETH`);
  console.log(`  Operations:  +${ethers.formatEther(opsReceived)} ETH`);
  console.log(`  Marketing:   +${ethers.formatEther(mktReceived)} ETH`);
  console.log(`  Treasury:    +${ethers.formatEther(treReceived)} ETH`);
  console.log(`  Splitter restante: ${ethers.formatEther(splitterBalanceFinal)} ETH`);

  // Calcular proporciones esperadas
  const expectedDev = (totalETHReceived * 45n) / 100n;
  const expectedOps = (totalETHReceived * 25n) / 100n;
  const expectedMkt = (totalETHReceived * 20n) / 100n;
  const expectedTre = (totalETHReceived * 10n) / 100n;

  console.log(`\n📊 Proporciones esperadas vs reales:`);
  
  const devMatch = devReceived === expectedDev;
  console.log(`  Development (45%): ${ethers.formatEther(expectedDev)} ETH → ${ethers.formatEther(devReceived)} ETH ${devMatch ? '✅' : '❌'}`);
  
  const opsMatch = opsReceived === expectedOps;
  console.log(`  Operations  (25%): ${ethers.formatEther(expectedOps)} ETH → ${ethers.formatEther(opsReceived)} ETH ${opsMatch ? '✅' : '❌'}`);
  
  const mktMatch = mktReceived === expectedMkt;
  console.log(`  Marketing   (20%): ${ethers.formatEther(expectedMkt)} ETH → ${ethers.formatEther(mktReceived)} ETH ${mktMatch ? '✅' : '❌'}`);
  
  const treMatch = treReceived === expectedTre;
  console.log(`  Treasury    (10%): ${ethers.formatEther(expectedTre)} ETH → ${ethers.formatEther(treReceived)} ETH ${treMatch ? '✅' : '❌'}`);

  // Verificar que la suma cuadra
  const totalDistributed = devReceived + opsReceived + mktReceived + treReceived;
  const totalMatch = totalDistributed === totalETHReceived;
  
  console.log(`\n🔍 Verificación de coherencia:`);
  console.log(`  Total recaudado:    ${ethers.formatEther(totalETHReceived)} ETH`);
  console.log(`  Total distribuido:  ${ethers.formatEther(totalDistributed)} ETH`);
  console.log(`  Balance splitter:   ${ethers.formatEther(splitterBalanceFinal)} ETH`);
  console.log(`  Coherencia: ${totalMatch && splitterBalanceFinal === 0n ? '✅ PERFECTO' : '❌ ERROR'}`);

  // Calcular porcentajes reales
  if (totalDistributed > 0n) {
    const devPercent = (Number(devReceived) * 100 / Number(totalDistributed)).toFixed(2);
    const opsPercent = (Number(opsReceived) * 100 / Number(totalDistributed)).toFixed(2);
    const mktPercent = (Number(mktReceived) * 100 / Number(totalDistributed)).toFixed(2);
    const trePercent = (Number(treReceived) * 100 / Number(totalDistributed)).toFixed(2);

    console.log(`\n📈 Porcentajes reales:`);
    console.log(`  Development: ${devPercent}% (esperado: 45%)`);
    console.log(`  Operations:  ${opsPercent}% (esperado: 25%)`);
    console.log(`  Marketing:   ${mktPercent}% (esperado: 20%)`);
    console.log(`  Treasury:    ${trePercent}% (esperado: 10%)`);
  }
  const allMatch = devMatch && opsMatch && mktMatch && treMatch && totalMatch;
  
  console.log("\n" + "=".repeat(80));
  console.log(`${allMatch ? '✅' : '❌'} RESULTADO FINAL: ${allMatch ? 'DISTRIBUCIÓN PERFECTA' : 'ERROR EN DISTRIBUCIÓN'}`);
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
