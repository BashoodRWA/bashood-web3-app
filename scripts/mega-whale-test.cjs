const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🐋 TEST EXTREMO DE BALLENAS: COMPRAS MASIVAS COMPLETAS");
  console.log("=".repeat(80));

  const [deployer, whale1, whale2, whale3, whale4, whale5, whale6, whale7, whale8] = await ethers.getSigners();
  
  console.log(`\n📋 Desplegando contratos...`);
  
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
  
  // Límite alto para ballenas
  tx = await bashoodPresale.setMaxPerUser(5000);
  await tx.wait();
  console.log(`✅ maxPerUser configurado a 5000`);
  
  tx = await bashoodPresale.startPresale();
  await tx.wait();
  await ethers.provider.send("evm_increaseTime", [15]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✅ Configuración completa`);

  const results = [];

  // ============================================
  // RONDA 1: COMPRAS MASIVAS CON ETH
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔥 RONDA 1: COMPRAS MASIVAS CON ETH");
  console.log("=".repeat(80));

  // Whale 1: 1000 NFTs
  console.log("\n🐋 WHALE #1: 1000 NFTs (100 ETH)");
  try {
    const qty = 1000;
    const nonce = 2001;
    const signature = await signNonce(deployer, whale1.address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const startTime = Date.now();
    const balanceBefore = await ethers.provider.getBalance(whale1.address);
    
    const purchaseTx = await bashoodPresale.connect(whale1).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const balanceAfter = await ethers.provider.getBalance(whale1.address);
    const nftBalance = await mockNFT.balanceOf(whale1.address, 1);
    
    results.push({ whale: 1, nfts: Number(nftBalance), method: 'ETH', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | ETH: ${ethers.formatEther(balanceBefore - balanceAfter)} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 1, nfts: 0, method: 'ETH', error: true });
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  let block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 2: 2000 NFTs
  console.log("\n🐋 WHALE #2: 2000 NFTs (200 ETH)");
  try {
    const qty = 2000;
    const nonce = 2002;
    const signature = await signNonce(deployer, whale2.address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const startTime = Date.now();
    const balanceBefore = await ethers.provider.getBalance(whale2.address);
    
    const purchaseTx = await bashoodPresale.connect(whale2).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const balanceAfter = await ethers.provider.getBalance(whale2.address);
    const nftBalance = await mockNFT.balanceOf(whale2.address, 1);
    
    results.push({ whale: 2, nfts: Number(nftBalance), method: 'ETH', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | ETH: ${ethers.formatEther(balanceBefore - balanceAfter)} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 2, nfts: 0, method: 'ETH', error: true });
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 3: 3000 NFTs
  console.log("\n🐋 WHALE #3: 3000 NFTs (300 ETH)");
  try {
    const qty = 3000;
    const nonce = 2003;
    const signature = await signNonce(deployer, whale3.address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const startTime = Date.now();
    const balanceBefore = await ethers.provider.getBalance(whale3.address);
    
    const purchaseTx = await bashoodPresale.connect(whale3).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const balanceAfter = await ethers.provider.getBalance(whale3.address);
    const nftBalance = await mockNFT.balanceOf(whale3.address, 1);
    
    results.push({ whale: 3, nfts: Number(nftBalance), method: 'ETH', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | ETH: ${ethers.formatEther(balanceBefore - balanceAfter)} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 3, nfts: 0, method: 'ETH', error: true });
  }

  // ============================================
  // RONDA 2: COMPRAS MASIVAS CON BHT
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔥 RONDA 2: COMPRAS MASIVAS CON BHT");
  console.log("=".repeat(80));

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 4: 500 NFTs con BHT
  console.log("\n🐋 WHALE #4: 500 NFTs con BHT (12.5M BHT)");
  try {
    const qty = 500;
    const bhtNeeded = ethers.parseUnits("25000", 18) * BigInt(qty);
    
    // Dar BHT
    tx = await bashoodToken.transfer(whale4.address, bhtNeeded * 2n); // Extra por burn
    await tx.wait();
    tx = await bashoodToken.connect(whale4).approve(presaleAddr, bhtNeeded * 2n);
    await tx.wait();
    
    const nonce = 2004;
    const signature = await signNonce(deployer, whale4.address, nonce);
    
    const startTime = Date.now();
    const bhtBalanceBefore = await bashoodToken.balanceOf(whale4.address);
    
    const purchaseTx = await bashoodPresale.connect(whale4).purchaseWithBHT(
      1, qty, nonce, signature
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const bhtBalanceAfter = await bashoodToken.balanceOf(whale4.address);
    const nftBalance = await mockNFT.balanceOf(whale4.address, 1);
    
    results.push({ whale: 4, nfts: Number(nftBalance), method: 'BHT', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | BHT gastado: ${ethers.formatUnits(bhtBalanceBefore - bhtBalanceAfter, 18)} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 4, nfts: 0, method: 'BHT', error: true });
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 5: 1000 NFTs con BHT
  console.log("\n🐋 WHALE #5: 1000 NFTs con BHT (25M BHT)");
  try {
    const qty = 1000;
    const bhtNeeded = ethers.parseUnits("25000", 18) * BigInt(qty);
    
    // Dar BHT
    tx = await bashoodToken.transfer(whale5.address, bhtNeeded * 2n);
    await tx.wait();
    tx = await bashoodToken.connect(whale5).approve(presaleAddr, bhtNeeded * 2n);
    await tx.wait();
    
    const nonce = 2005;
    const signature = await signNonce(deployer, whale5.address, nonce);
    
    const startTime = Date.now();
    const bhtBalanceBefore = await bashoodToken.balanceOf(whale5.address);
    
    const purchaseTx = await bashoodPresale.connect(whale5).purchaseWithBHT(
      1, qty, nonce, signature
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const bhtBalanceAfter = await bashoodToken.balanceOf(whale5.address);
    const nftBalance = await mockNFT.balanceOf(whale5.address, 1);
    
    results.push({ whale: 5, nfts: Number(nftBalance), method: 'BHT', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | BHT gastado: ${ethers.formatUnits(bhtBalanceBefore - bhtBalanceAfter, 18)} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 5, nfts: 0, method: 'BHT', error: true });
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 6: 1500 NFTs con BHT
  console.log("\n🐋 WHALE #6: 1500 NFTs con BHT (37.5M BHT)");
  try {
    const qty = 1500;
    const bhtNeeded = ethers.parseUnits("25000", 18) * BigInt(qty);
    
    // Dar BHT
    tx = await bashoodToken.transfer(whale6.address, bhtNeeded * 2n);
    await tx.wait();
    tx = await bashoodToken.connect(whale6).approve(presaleAddr, bhtNeeded * 2n);
    await tx.wait();
    
    const nonce = 2006;
    const signature = await signNonce(deployer, whale6.address, nonce);
    
    const startTime = Date.now();
    const bhtBalanceBefore = await bashoodToken.balanceOf(whale6.address);
    
    const purchaseTx = await bashoodPresale.connect(whale6).purchaseWithBHT(
      1, qty, nonce, signature
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const bhtBalanceAfter = await bashoodToken.balanceOf(whale6.address);
    const nftBalance = await mockNFT.balanceOf(whale6.address, 1);
    
    results.push({ whale: 6, nfts: Number(nftBalance), method: 'BHT', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | BHT gastado: ${ethers.formatUnits(bhtBalanceBefore - bhtBalanceAfter, 18)} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 6, nfts: 0, method: 'BHT', error: true });
  }

  // ============================================
  // RONDA 3: COMPRAS MIXTAS (ETH + BHT mismo whale)
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔥 RONDA 3: COMPRAS MIXTAS (mismo whale, múltiples compras)");
  console.log("=".repeat(80));

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 7: Primero 500 con ETH
  console.log("\n🐋 WHALE #7 (Parte 1): 500 NFTs con ETH");
  try {
    const qty = 500;
    const nonce = 2007;
    const signature = await signNonce(deployer, whale7.address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    const startTime = Date.now();
    const purchaseTx = await bashoodPresale.connect(whale7).purchaseWithETH(
      1, qty, nonce, signature, { value: ethValue }
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const nftBalance = await mockNFT.balanceOf(whale7.address, 1);
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // Whale 7: Luego 500 con BHT
  console.log("\n🐋 WHALE #7 (Parte 2): 500 NFTs con BHT");
  try {
    const qty = 500;
    const bhtNeeded = ethers.parseUnits("25000", 18) * BigInt(qty);
    
    tx = await bashoodToken.transfer(whale7.address, bhtNeeded * 2n);
    await tx.wait();
    tx = await bashoodToken.connect(whale7).approve(presaleAddr, bhtNeeded * 2n);
    await tx.wait();
    
    const nonce = 2008;
    const signature = await signNonce(deployer, whale7.address, nonce);
    
    const startTime = Date.now();
    const purchaseTx = await bashoodPresale.connect(whale7).purchaseWithBHT(
      1, qty, nonce, signature
    );
    const receipt = await purchaseTx.wait();
    const elapsed = Date.now() - startTime;
    
    const nftBalance = await mockNFT.balanceOf(whale7.address, 1);
    
    results.push({ whale: 7, nfts: Number(nftBalance), method: 'MIX', gas: Number(receipt.gasUsed), time: elapsed });
    
    console.log(`   ✅ ${elapsed}ms | Gas: ${receipt.gasUsed} | Total NFTs: ${nftBalance}`);
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 100)}`);
    results.push({ whale: 7, nfts: 0, method: 'MIX', error: true });
  }

  // ============================================
  // VALIDACIÓN DE COHERENCIA
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("🔍 VALIDACIÓN DE COHERENCIA");
  console.log("=".repeat(80));

  const totalSold = await bashoodPresale.totalNFTsSold();
  const remainingNFTs = await mockNFT.balanceOf(presaleAddr, 1);
  const remainingBHT = await bashoodToken.balanceOf(presaleAddr);
  const initialNFTs = 10000n;
  const initialBHT = ethers.parseUnits("250000000", 18);

  console.log(`\n📊 Estado del contrato:`);
  console.log(`  Total NFTs vendidos: ${totalSold}`);
  console.log(`  NFTs restantes: ${remainingNFTs}`);
  console.log(`  BHT restante: ${ethers.formatUnits(remainingBHT, 18)}`);

  // Validar coherencia
  const calculatedRemaining = initialNFTs - totalSold;
  const coherenceCheck1 = calculatedRemaining === remainingNFTs;
  console.log(`\n✓ Coherencia NFTs: ${coherenceCheck1 ? '✅ CORRECTO' : '❌ ERROR'}`);
  console.log(`  Esperado: ${calculatedRemaining} | Real: ${remainingNFTs}`);

  // Sumar NFTs de todas las ballenas
  let whaleNFTsSum = 0n;
  for (let i = 1; i <= 7; i++) {
    const whale = [null, whale1, whale2, whale3, whale4, whale5, whale6, whale7][i];
    const nfts = await mockNFT.balanceOf(whale.address, 1);
    whaleNFTsSum += nfts;
  }

  const coherenceCheck2 = whaleNFTsSum === totalSold;
  console.log(`\n✓ Coherencia suma ballenas: ${coherenceCheck2 ? '✅ CORRECTO' : '❌ ERROR'}`);
  console.log(`  Suma ballenas: ${whaleNFTsSum} | Total vendidos: ${totalSold}`);

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN COMPLETO");
  console.log("=".repeat(80));

  console.log(`\n🐋 Detalles por ballena:`);
  for (let i = 1; i <= 7; i++) {
    const whale = [null, whale1, whale2, whale3, whale4, whale5, whale6, whale7][i];
    const nfts = await mockNFT.balanceOf(whale.address, 1);
    const result = results.find(r => r.whale === i) || {};
    const method = result.method || '-';
    const gas = result.gas || 0;
    const time = result.time || 0;
    
    console.log(`  Whale #${i}: ${nfts} NFTs | ${method} | ${gas.toLocaleString()} gas | ${time}ms`);
  }

  console.log(`\n💰 Totales:`);
  console.log(`  Total NFTs vendidos: ${totalSold}`);
  console.log(`  Total NFTs restantes: ${remainingNFTs} / ${initialNFTs}`);
  console.log(`  % Vendido: ${(Number(totalSold) / Number(initialNFTs) * 100).toFixed(2)}%`);
  
  const totalGas = results.reduce((sum, r) => sum + (r.gas || 0), 0);
  const avgGas = results.filter(r => !r.error).length > 0 ? totalGas / results.filter(r => !r.error).length : 0;
  console.log(`\n⛽ Gas:`);
  console.log(`  Total gas usado: ${totalGas.toLocaleString()}`);
  console.log(`  Gas promedio: ${Math.round(avgGas).toLocaleString()}`);

  const ethMethods = results.filter(r => r.method === 'ETH');
  const bhtMethods = results.filter(r => r.method === 'BHT');
  console.log(`\n📈 Distribución:`);
  console.log(`  Compras ETH: ${ethMethods.length} (${ethMethods.reduce((sum, r) => sum + r.nfts, 0)} NFTs)`);
  console.log(`  Compras BHT: ${bhtMethods.length} (${bhtMethods.reduce((sum, r) => sum + r.nfts, 0)} NFTs)`);
  console.log(`  Compras MIX: ${results.filter(r => r.method === 'MIX').length}`);

  console.log(`\n${coherenceCheck1 && coherenceCheck2 ? '✅' : '❌'} Coherencia general: ${coherenceCheck1 && coherenceCheck2 ? 'PERFECTA' : 'ERROR'}`);

  console.log("\n✅ TEST EXTREMO COMPLETADO");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
