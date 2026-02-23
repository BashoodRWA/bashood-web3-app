const hre = require("hardhat");
const ethers = hre.ethers;

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🐋 TEST DE BALLENAS: COMPRAS MASIVAS (100-700 NFTs)");
  console.log("=".repeat(80));

  const [deployer, whale1, whale2, whale3, whale4, whale5] = await ethers.getSigners();
  
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
  
  // Configurar límite alto para ballenas
  tx = await bashoodPresale.setMaxPerUser(1000);
  await tx.wait();
  console.log(`✅ maxPerUser configurado a 1000`);
  
  tx = await bashoodPresale.startPresale();
  await tx.wait();
  await ethers.provider.send("evm_increaseTime", [15]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✅ Configuración completa`);

  // TEST 1: Compra de 100 NFTs (10 ETH)
  console.log("\n" + "=".repeat(80));
  console.log("🐋 WHALE #1: Comprando 100 NFTs (10 ETH)");
  console.log("=".repeat(80));

  try {
    const qty1 = 100;
    const nonce1 = 1001;
    const signature1 = await signNonce(deployer, whale1.address, nonce1);
    const ethValue1 = ethers.parseEther("0.1") * BigInt(qty1);
    
    const balanceBefore1 = await ethers.provider.getBalance(whale1.address);
    const startTime1 = Date.now();
    
    const tx1 = await bashoodPresale.connect(whale1).purchaseWithETH(
      1, qty1, nonce1, signature1, { value: ethValue1 }
    );
    const receipt1 = await tx1.wait();
    const elapsed1 = Date.now() - startTime1;
    
    const balanceAfter1 = await ethers.provider.getBalance(whale1.address);
    const nftBalance1 = await mockNFT.balanceOf(whale1.address, 1);
    
    console.log(`✅ Compra exitosa!`);
    console.log(`   Tiempo: ${elapsed1}ms`);
    console.log(`   Gas usado: ${receipt1.gasUsed}`);
    console.log(`   ETH gastado: ${ethers.formatEther(balanceBefore1 - balanceAfter1)}`);
    console.log(`   NFTs recibidos: ${nftBalance1}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 150)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  let block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // TEST 2: Compra de 250 NFTs (25 ETH)
  console.log("\n" + "=".repeat(80));
  console.log("🐋 WHALE #2: Comprando 250 NFTs (25 ETH)");
  console.log("=".repeat(80));

  try {
    const qty2 = 250;
    const nonce2 = 1002;
    const signature2 = await signNonce(deployer, whale2.address, nonce2);
    const ethValue2 = ethers.parseEther("0.1") * BigInt(qty2);
    
    const balanceBefore2 = await ethers.provider.getBalance(whale2.address);
    const startTime2 = Date.now();
    
    const tx2 = await bashoodPresale.connect(whale2).purchaseWithETH(
      1, qty2, nonce2, signature2, { value: ethValue2 }
    );
    const receipt2 = await tx2.wait();
    const elapsed2 = Date.now() - startTime2;
    
    const balanceAfter2 = await ethers.provider.getBalance(whale2.address);
    const nftBalance2 = await mockNFT.balanceOf(whale2.address, 1);
    
    console.log(`✅ Compra exitosa!`);
    console.log(`   Tiempo: ${elapsed2}ms`);
    console.log(`   Gas usado: ${receipt2.gasUsed}`);
    console.log(`   ETH gastado: ${ethers.formatEther(balanceBefore2 - balanceAfter2)}`);
    console.log(`   NFTs recibidos: ${nftBalance2}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 150)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // TEST 3: Compra de 500 NFTs (50 ETH)
  console.log("\n" + "=".repeat(80));
  console.log("🐋 WHALE #3: Comprando 500 NFTs (50 ETH)");
  console.log("=".repeat(80));

  try {
    const qty3 = 500;
    const nonce3 = 1003;
    const signature3 = await signNonce(deployer, whale3.address, nonce3);
    const ethValue3 = ethers.parseEther("0.1") * BigInt(qty3);
    
    const balanceBefore3 = await ethers.provider.getBalance(whale3.address);
    const startTime3 = Date.now();
    
    const tx3 = await bashoodPresale.connect(whale3).purchaseWithETH(
      1, qty3, nonce3, signature3, { value: ethValue3 }
    );
    const receipt3 = await tx3.wait();
    const elapsed3 = Date.now() - startTime3;
    
    const balanceAfter3 = await ethers.provider.getBalance(whale3.address);
    const nftBalance3 = await mockNFT.balanceOf(whale3.address, 1);
    
    console.log(`✅ Compra exitosa!`);
    console.log(`   Tiempo: ${elapsed3}ms`);
    console.log(`   Gas usado: ${receipt3.gasUsed}`);
    console.log(`   ETH gastado: ${ethers.formatEther(balanceBefore3 - balanceAfter3)}`);
    console.log(`   NFTs recibidos: ${nftBalance3}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 150)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // TEST 4: Compra de 700 NFTs (70 ETH)
  console.log("\n" + "=".repeat(80));
  console.log("🐋 WHALE #4: Comprando 700 NFTs (70 ETH)");
  console.log("=".repeat(80));

  try {
    const qty4 = 700;
    const nonce4 = 1004;
    const signature4 = await signNonce(deployer, whale4.address, nonce4);
    const ethValue4 = ethers.parseEther("0.1") * BigInt(qty4);
    
    const balanceBefore4 = await ethers.provider.getBalance(whale4.address);
    const startTime4 = Date.now();
    
    const tx4 = await bashoodPresale.connect(whale4).purchaseWithETH(
      1, qty4, nonce4, signature4, { value: ethValue4 }
    );
    const receipt4 = await tx4.wait();
    const elapsed4 = Date.now() - startTime4;
    
    const balanceAfter4 = await ethers.provider.getBalance(whale4.address);
    const nftBalance4 = await mockNFT.balanceOf(whale4.address, 1);
    
    console.log(`✅ Compra exitosa!`);
    console.log(`   Tiempo: ${elapsed4}ms`);
    console.log(`   Gas usado: ${receipt4.gasUsed}`);
    console.log(`   ETH gastado: ${ethers.formatEther(balanceBefore4 - balanceAfter4)}`);
    console.log(`   NFTs recibidos: ${nftBalance4}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 150)}`);
  }

  // Actualizar precio
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  block = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block.timestamp);
  await tx.wait();

  // TEST 5: Compra de 1000 NFTs (100 ETH) - LÍMITE MÁXIMO
  console.log("\n" + "=".repeat(80));
  console.log("🐋 WHALE #5: Comprando 1000 NFTs (100 ETH) - LÍMITE MÁXIMO");
  console.log("=".repeat(80));

  try {
    const qty5 = 1000;
    const nonce5 = 1005;
    const signature5 = await signNonce(deployer, whale5.address, nonce5);
    const ethValue5 = ethers.parseEther("0.1") * BigInt(qty5);
    
    const balanceBefore5 = await ethers.provider.getBalance(whale5.address);
    const startTime5 = Date.now();
    
    const tx5 = await bashoodPresale.connect(whale5).purchaseWithETH(
      1, qty5, nonce5, signature5, { value: ethValue5 }
    );
    const receipt5 = await tx5.wait();
    const elapsed5 = Date.now() - startTime5;
    
    const balanceAfter5 = await ethers.provider.getBalance(whale5.address);
    const nftBalance5 = await mockNFT.balanceOf(whale5.address, 1);
    
    console.log(`✅ Compra exitosa!`);
    console.log(`   Tiempo: ${elapsed5}ms`);
    console.log(`   Gas usado: ${receipt5.gasUsed}`);
    console.log(`   ETH gastado: ${ethers.formatEther(balanceBefore5 - balanceAfter5)}`);
    console.log(`   NFTs recibidos: ${nftBalance5}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 150)}`);
  }

  // RESUMEN
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN DE BALLENAS");
  console.log("=".repeat(80));

  const totalSold = await bashoodPresale.totalNFTsSold();
  const remainingNFTs = await mockNFT.balanceOf(presaleAddr, 1);
  const remainingBHT = await bashoodToken.balanceOf(presaleAddr);

  console.log(`\n📈 Estado final:`);
  console.log(`  Total NFTs vendidos: ${totalSold}`);
  console.log(`  NFTs restantes: ${remainingNFTs}`);
  console.log(`  BHT restante: ${ethers.formatUnits(remainingBHT, 18)}`);

  console.log(`\n🐋 Ballenas:`);
  const whale1NFTs = await mockNFT.balanceOf(whale1.address, 1);
  const whale2NFTs = await mockNFT.balanceOf(whale2.address, 1);
  const whale3NFTs = await mockNFT.balanceOf(whale3.address, 1);
  const whale4NFTs = await mockNFT.balanceOf(whale4.address, 1);
  const whale5NFTs = await mockNFT.balanceOf(whale5.address, 1);

  console.log(`  Whale #1: ${whale1NFTs} NFTs`);
  console.log(`  Whale #2: ${whale2NFTs} NFTs`);
  console.log(`  Whale #3: ${whale3NFTs} NFTs`);
  console.log(`  Whale #4: ${whale4NFTs} NFTs`);
  console.log(`  Whale #5: ${whale5NFTs} NFTs`);

  const totalWhaleNFTs = whale1NFTs + whale2NFTs + whale3NFTs + whale4NFTs + whale5NFTs;
  console.log(`\n  💎 Total NFTs de ballenas: ${totalWhaleNFTs}`);
  console.log(`  📊 % del total vendido: ${(Number(totalWhaleNFTs) / Number(totalSold) * 100).toFixed(2)}%`);

  console.log("\n✅ TEST DE BALLENAS COMPLETADO");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  });
