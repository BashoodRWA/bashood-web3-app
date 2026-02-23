const hre = require("hardhat");
const ethers = hre.ethers;

// Helper para generar firma
function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔥 TEST DE ESTRÉS COMPLETO: DEPLOY + COMPRAS COMPULSIVAS");
  console.log("=".repeat(80));

  const [deployer, ...buyers] = await ethers.getSigners();
  
  console.log(`\n📋 Configuración:`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Buyers disponibles: ${buyers.length}`);

  // 1. Deploy rápido
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

  // 2. Configuración
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

  // 3. ESTRÉS: Compras masivas
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 1: 15 compras con ETH simultáneas (1 NFT cada una)");
  console.log("=".repeat(80));

  let startTime = Date.now();
  let purchases = [];
  
  for (let i = 0; i < 15; i++) {
    const buyer = buyers[i];
    const nonce = 1000 + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, 
        { value: ethers.parseEther("0.1") })
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    const elapsed = Date.now() - startTime;
    console.log(`✅ 15 compras completadas en ${elapsed}ms`);
    console.log(`   Gas total: ${totalGas} (~${totalGas / 15n} promedio)`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 100)}`);
  }

  // Actualizar price
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block2 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block2.timestamp);
  await tx.wait();

  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 2: 4 compras con cantidades VARIABLES");
  console.log("=".repeat(80));

  startTime = Date.now();
  purchases = [];
  const quantities = [3, 5, 2, 4];
  
  for (let i = 0; i < 4; i++) {
    const buyer = buyers[15 + i]; // buyer 16-19
    const qty = quantities[i];
    const nonce = 2000 + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithETH(1, qty, nonce, signature, { value: ethValue })
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    const totalQty = quantities.reduce((sum, q) => sum + q, 0);
    const elapsed = Date.now() - startTime;
    console.log(`✅ 4 compras (${totalQty} NFTs total) en ${elapsed}ms`);
    console.log(`   Gas total: ${totalGas} (~${totalGas / 4n} promedio)`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 100)}`);
  }

  // Actualizar price
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block3 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block3.timestamp);
  await tx.wait();

  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 3: 10 compras con BHT (reutilizando buyers)");
  console.log("=".repeat(80));

  // Dar BHT a compradores
  const bhtBuyers = buyers.slice(0, 10); // Reutilizar primeros 10
  for (const buyer of bhtBuyers) {
    tx = await bashoodToken.transfer(buyer.address, ethers.parseUnits("100000", 18));
    await tx.wait();
    tx = await bashoodToken.connect(buyer).approve(presaleAddr, ethers.parseUnits("100000", 18));
    await tx.wait();
  }

  startTime = Date.now();
  purchases = [];
  
  for (let i = 0; i < 10; i++) {
    const buyer = bhtBuyers[i];
    const nonce = 3000 + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature)
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    const elapsed = Date.now() - startTime;
    console.log(`✅ 10 compras con BHT en ${elapsed}ms`);
    console.log(`   Gas total: ${totalGas} (~${totalGas / 10n} promedio)`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 100)}`);
  }

  // Actualizar price
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block4 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block4.timestamp);
  await tx.wait();

  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 4: MIX - 5 ETH + 5 BHT simultáneos");
  console.log("=".repeat(80));

  // Dar BHT a más compradores
  const moreBhtBuyers = buyers.slice(10, 15);
  for (const buyer of moreBhtBuyers) {
    tx = await bashoodToken.transfer(buyer.address, ethers.parseUnits("50000", 18));
    await tx.wait();
    tx = await bashoodToken.connect(buyer).approve(presaleAddr, ethers.parseUnits("50000", 18));
    await tx.wait();
  }

  startTime = Date.now();
  purchases = [];
  
  // 5 ETH (reutilizar buyers 0-4)
  for (let i = 0; i < 5; i++) {
    const buyer = buyers[i];
    const nonce = 4000 + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, 
        { value: ethers.parseEther("0.1") })
    );
  }
  
  // 5 BHT
  for (let i = 0; i < 5; i++) {
    const buyer = moreBhtBuyers[i];
    const nonce = 5000 + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature)
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    const elapsed = Date.now() - startTime;
    console.log(`✅ 10 compras mixtas en ${elapsed}ms`);
    console.log(`   Gas total: ${totalGas} (~${totalGas / 10n} promedio)`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 100)}`);
  }

  // RESUMEN
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN FINAL");
  console.log("=".repeat(80));

  const finalSold = await bashoodPresale.totalNFTsSold();
  const finalNFTs = await mockNFT.balanceOf(presaleAddr, 1);
  const finalBHT = await bashoodToken.balanceOf(presaleAddr);

  console.log(`\n📈 Resultados:`);
  console.log(`  Total NFTs vendidos: ${finalSold}`);
  console.log(`  NFTs restantes: ${finalNFTs}`);
  console.log(`  BHT restante: ${ethers.formatUnits(finalBHT, 18)}`);

  console.log(`\n🔍 Muestra de compradores:`);
  for (let i = 0; i < 10; i++) {
    const nftBalance = await mockNFT.balanceOf(buyers[i].address, 1);
    console.log(`  Buyer ${i + 1}: ${nftBalance} NFTs`);
  }

  console.log("\n✅ TEST DE ESTRÉS COMPLETADO");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
