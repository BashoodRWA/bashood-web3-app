const hre = require("hardhat");
const ethers = hre.ethers;

// Helper para generar firma
function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔥 TEST DE ESTRÉS: COMPRAS COMPULSIVAS SIMULTÁNEAS");
  console.log("=".repeat(80));

  // Obtener contracts desplegados
  const [deployer, ...buyers] = await ethers.getSigners();
  
  // Direcciones de los contratos desplegados (del último deployment)
  const tokenAddr = "0x98D6E62A6A0Acbe1Ee59B03fa71a5BaFD7AC80D5";
  const nftAddr = "0x9Ee89d92618C40e51CD4420DF27604aF8344f4F8";
  const priceFeedAddr = "0x76C831CAC8d232e6Ba6dE2982d37a96cc4452Bc3";
  const presaleAddr = "0xd05e6d21547B96FF5c1d0A8117760CF54f07AeaD";

  console.log(`\n📋 Conectando a contratos desplegados...`);
  const bashoodToken = await ethers.getContractAt("BashoodToken", tokenAddr);
  const mockNFT = await ethers.getContractAt("contracts/mocks/MockNFT1155.sol:MockNFT1155", nftAddr);
  const mockPriceFeed = await ethers.getContractAt("contracts/mocks/MockPriceFeed.sol:MockPriceFeed", priceFeedAddr);
  const bashoodPresale = await ethers.getContractAt("BashoodPresaleFinal", presaleAddr);

  // Estado inicial
  const initialNFTs = await mockNFT.balanceOf(presaleAddr, 1);
  const initialBHT = await bashoodToken.balanceOf(presaleAddr);
  const initialSold = await bashoodPresale.totalNFTsSold();

  console.log(`\n📊 Estado inicial:`);
  console.log(`  NFTs disponibles: ${initialNFTs}`);
  console.log(`  BHT disponible: ${ethers.formatUnits(initialBHT, 18)}`);
  console.log(`  NFTs vendidos: ${initialSold}`);

  // Configurar maxPerUser si es necesario
  const currentMaxPerUser = await bashoodPresale.maxPerUser();
  console.log(`\n📋 maxPerUser actual: ${currentMaxPerUser}`);
  
  if (currentMaxPerUser < 100n) {
    console.log(`⚙️  Aumentando maxPerUser a 100...`);
    let tx = await bashoodPresale.setMaxPerUser(100); // 100 NFTs por usuario
    await tx.wait();
    console.log(`✅ maxPerUser configurado a 100`);
  }

  // Actualizar price feed para todas las compras
  const currentBlock = await ethers.provider.getBlock('latest');
  let tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), currentBlock.timestamp);
  await tx.wait();
  console.log(`\n✅ Price feed actualizado`);

  // ROUND 1: 10 compradores simultáneos con ETH (pequeñas compras)
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 1: 10 compradores con 0.1 ETH cada uno (1 NFT)");
  console.log("=".repeat(80));

  let purchases = [];
  let startNonce = 100;

  for (let i = 0; i < 10; i++) {
    const buyer = buyers[i];
    const nonce = startNonce + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithETH(
        1, // nftId
        1, // quantity
        nonce,
        signature,
        { value: ethers.parseEther("0.1") }
      )
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas1 = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    console.log(`✅ 10 compras completadas!`);
    console.log(`   Gas total: ${totalGas1}`);
    console.log(`   Gas promedio: ${totalGas1 / 10n} por compra`);
  } catch (error) {
    console.log(`❌ Error en Round 1: ${error.message}`);
  }

  // ROUND 2: 5 compradores con cantidades variadas (ETH)
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 2: 5 compradores con cantidades VARIADAS en ETH");
  console.log("=".repeat(80));

  // Actualizar price feed
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block2 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block2.timestamp);
  await tx.wait();

  purchases = [];
  const quantities = [2, 3, 2, 2, 1]; // Diferentes cantidades (total 10)
  startNonce = 200;

  for (let i = 0; i < 5; i++) {
    const buyer = buyers[10 + i];
    const qty = quantities[i];
    const nonce = startNonce + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    const ethValue = ethers.parseEther("0.1") * BigInt(qty);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithETH(
        1,
        qty,
        nonce,
        signature,
        { value: ethValue }
      )
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas2 = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    const totalQty = quantities.reduce((sum, q) => sum + q, 0);
    console.log(`✅ 5 compras completadas (total ${totalQty} NFTs)!`);
    console.log(`   Gas total: ${totalGas2}`);
    console.log(`   Gas promedio: ${totalGas2 / 5n} por compra`);
  } catch (error) {
    console.log(`❌ Error en Round 2: ${error.message}`);
  }

  // ROUND 3: Compras con BHT (dar BHT a compradores primero)
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 3: 8 compradores con BHT (25k BHT cada uno)");
  console.log("=".repeat(80));

  // Actualizar price feed
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block3 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block3.timestamp);
  await tx.wait();

  // Dar BHT a 8 compradores
  const bhtBuyers = buyers.slice(15, 23);
  for (const buyer of bhtBuyers) {
    tx = await bashoodToken.transfer(buyer.address, ethers.parseUnits("100000", 18));
    await tx.wait();
    tx = await bashoodToken.connect(buyer).approve(presaleAddr, ethers.parseUnits("100000", 18));
    await tx.wait();
  }
  console.log(`✅ 8 compradores recibieron BHT y aprobaron presale`);

  purchases = [];
  startNonce = 300;

  for (let i = 0; i < 8; i++) {
    const buyer = bhtBuyers[i];
    const nonce = startNonce + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithBHT(
        1,
        1,
        nonce,
        signature
      )
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas3 = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    console.log(`✅ 8 compras con BHT completadas!`);
    console.log(`   Gas total: ${totalGas3}`);
    console.log(`   Gas promedio: ${totalGas3 / 8n} por compra`);
  } catch (error) {
    console.log(`❌ Error en Round 3: ${error.message}`);
  }

  // ROUND 4: Mix caótico (ETH + BHT simultáneos)
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 4: MIX CAÓTICO - ETH y BHT simultáneos");
  console.log("=".repeat(80));

  // Actualizar price feed
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block4 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block4.timestamp);
  await tx.wait();

  purchases = [];
  startNonce = 400;

  // 5 con ETH
  for (let i = 0; i < 5; i++) {
    const buyer = buyers[23 + i];
    const nonce = startNonce + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithETH(
        1,
        1,
        nonce,
        signature,
        { value: ethers.parseEther("0.1") }
      )
    );
  }

  // Preparar 5 con BHT
  const bhtBuyers2 = buyers.slice(28, 33);
  for (const buyer of bhtBuyers2) {
    tx = await bashoodToken.transfer(buyer.address, ethers.parseUnits("50000", 18));
    await tx.wait();
    tx = await bashoodToken.connect(buyer).approve(presaleAddr, ethers.parseUnits("50000", 18));
    await tx.wait();
  }

  // 5 con BHT
  for (let i = 0; i < 5; i++) {
    const buyer = bhtBuyers2[i];
    const nonce = startNonce + 5 + i;
    const signature = await signNonce(deployer, buyer.address, nonce);
    
    purchases.push(
      bashoodPresale.connect(buyer).purchaseWithBHT(
        1,
        1,
        nonce,
        signature
      )
    );
  }

  try {
    const receipts = await Promise.all(purchases.map(p => p.then(tx => tx.wait())));
    const totalGas4 = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
    console.log(`✅ 10 compras mixtas completadas!`);
    console.log(`   Gas total: ${totalGas4}`);
    console.log(`   Gas promedio: ${totalGas4 / 10n} por compra`);
  } catch (error) {
    console.log(`❌ Error en Round 4: ${error.message}`);
  }

  // ROUND 5: Compras repetidas del mismo usuario (burst)
  console.log("\n" + "=".repeat(80));
  console.log("🔥 ROUND 5: BURST - 1 usuario comprando 5 veces seguidas");
  console.log("=".repeat(80));

  // Actualizar price feed
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const block5 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), block5.timestamp);
  await tx.wait();

  const burstBuyer = buyers[33];
  startNonce = 500;

  for (let i = 0; i < 5; i++) {
    const nonce = startNonce + i;
    const signature = await signNonce(deployer, burstBuyer.address, nonce);
    
    try {
      const purchaseTx = await bashoodPresale.connect(burstBuyer).purchaseWithETH(
        1,
        1,
        nonce,
        signature,
        { value: ethers.parseEther("0.1") }
      );
      const receipt = await purchaseTx.wait();
      console.log(`  ✅ Compra ${i + 1}/5: Gas ${receipt.gasUsed}`);
    } catch (error) {
      console.log(`  ❌ Compra ${i + 1}/5 falló: ${error.message.substring(0, 80)}`);
    }
  }

  // RESUMEN FINAL
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN FINAL DEL TEST DE ESTRÉS");
  console.log("=".repeat(80));

  const finalNFTs = await mockNFT.balanceOf(presaleAddr, 1);
  const finalBHT = await bashoodToken.balanceOf(presaleAddr);
  const finalSold = await bashoodPresale.totalNFTsSold();

  console.log(`\n📈 Comparación:`);
  console.log(`  NFTs vendidos: ${initialSold} → ${finalSold} (+${finalSold - initialSold})`);
  console.log(`  NFTs restantes: ${initialNFTs} → ${finalNFTs}`);
  console.log(`  BHT restante: ${ethers.formatUnits(initialBHT, 18)} → ${ethers.formatUnits(finalBHT, 18)}`);

  // Validar algunos compradores
  console.log(`\n🔍 Validación de compradores:`);
  for (let i = 0; i < 5; i++) {
    const buyer = buyers[i];
    const nftBalance = await mockNFT.balanceOf(buyer.address, 1);
    console.log(`  Buyer ${i + 1}: ${nftBalance} NFTs`);
  }

  console.log("\n✅ TEST DE ESTRÉS COMPLETADO");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR FATAL:", error);
    process.exit(1);
  });
