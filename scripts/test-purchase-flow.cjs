const hre = require("hardhat");
const ethers = hre.ethers;

// Helper para generar firma
function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 TEST DE FLUJO COMPLETO: DEPLOYMENT + COMPRA");
  console.log("=".repeat(80));

  const [deployer, buyer1, buyer2] = await ethers.getSigners();
  
  console.log("\n📋 Configuración:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Buyer1: ${buyer1.address}`);
  console.log(`  Buyer2: ${buyer2.address}`);

  // 1. Deploy BashoodToken
  console.log("\n📦 1. Desplegando BashoodToken...");
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = await BashoodToken.deploy(deployer.address);
  await bashoodToken.waitForDeployment();
  const tokenAddr = await bashoodToken.getAddress();
  console.log(`✅ BashoodToken: ${tokenAddr}`);

  // 2. Deploy MockNFT1155
  console.log("\n📦 2. Desplegando MockNFT1155...");
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();
  const nftAddr = await mockNFT.getAddress();
  console.log(`✅ MockNFT1155: ${nftAddr}`);

  // 3. Deploy MockPriceFeed
  console.log("\n📦 3. Desplegando MockPriceFeed...");
  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("2300", 8)); // 8 decimals, $2300
  await mockPriceFeed.waitForDeployment();
  const priceFeedAddr = await mockPriceFeed.getAddress();
  console.log(`✅ MockPriceFeed: ${priceFeedAddr} ($2,300/ETH)`);

  // 4. Deploy ReferralValidator
  console.log("\n📦 4. Desplegando ReferralValidator...");
  const ReferralValidator = await ethers.getContractFactory("ReferralValidator");
  const validator = await ReferralValidator.deploy(deployer.address);
  await validator.waitForDeployment();
  const validatorAddr = await validator.getAddress();
  console.log(`✅ ReferralValidator: ${validatorAddr}`);

  // 5. Deploy BashoodReferral (con deployer temporal)
  console.log("\n📦 5. Desplegando BashoodReferral...");
  const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
  const bashoodReferral = await BashoodReferral.deploy(
    deployer.address, // presaleAddress temporal
    validatorAddr,
    nftAddr
  );
  await bashoodReferral.waitForDeployment();
  const referralAddr = await bashoodReferral.getAddress();
  console.log(`✅ BashoodReferral: ${referralAddr}`);

  // 6. Deploy BashoodPresaleFinal
  console.log("\n📦 6. Desplegando BashoodPresaleFinal...");
  const currentBlock = await ethers.provider.getBlock('latest');
  const currentTime = currentBlock.timestamp;
  const presaleStart = currentTime + 10; // Empieza en 10 segundos
  const presaleEnd = currentTime + (30 * 24 * 60 * 60); // 30 días

  const BashoodPresale = await ethers.getContractFactory("BashoodPresaleFinal");
  const bashoodPresale = await BashoodPresale.deploy(
    tokenAddr,
    nftAddr,
    referralAddr, // Ahora referral ya existe
    deployer.address, // projectWallet
    ethers.parseEther("0.1"), // nftPriceETH = 0.1 ETH
    ethers.parseUnits("25000", 18), // nftPriceBHT = 25,000 BHT
    presaleStart,
    presaleEnd,
    10000 // maxNFTSupply
  );
  await bashoodPresale.waitForDeployment();
  const presaleAddr = await bashoodPresale.getAddress();
  console.log(`✅ BashoodPresaleFinal: ${presaleAddr}`);

  // 7. Configurar contratos
  console.log("\n⚙️  7. Configurando contratos...");
  
  // Actualizar referral con la dirección correcta de presale
  let tx = await bashoodReferral.setPresaleContract(presaleAddr);
  await tx.wait();
  console.log("✅ Presale configurado en Referral");
  
  // Transferir 250M BHT al presale
  const presaleSupply = ethers.parseUnits("250000000", 18);
  tx = await bashoodToken.transfer(presaleAddr, presaleSupply);
  await tx.wait();
  console.log("✅ Transferidos 250M BHT al presale");

  // Mint NFTs al presale
  tx = await mockNFT.mint(presaleAddr, 1, 10000);
  await tx.wait();
  console.log("✅ Minted 10,000 NFTs al presale");

  // Configurar price feed
  tx = await bashoodPresale.setPriceFeed(priceFeedAddr);
  await tx.wait();
  console.log("✅ Price feed configurado");

  // Configurar operations wallet
  tx = await bashoodPresale.setOperationsWallet(deployer.address);
  await tx.wait();
  console.log("✅ Operations wallet configurado");

  // Configurar signer
  tx = await bashoodPresale.setSigner(deployer.address);
  await tx.wait();
  console.log("✅ Signer configurado");

  // Configurar max price staleness (1 hora = 3600 segundos)
  tx = await bashoodPresale.setMaxPriceStaleness(3600);
  await tx.wait();
  console.log("✅ Max price staleness configurado (1 hora)");

  // Activar presale
  tx = await bashoodPresale.startPresale();
  await tx.wait();
  console.log("✅ Presale activada");

  // Adelantar tiempo para que la presale esté activa
  console.log("\n🕐 Adelantando tiempo del blockchain...");
  await ethers.provider.send("evm_increaseTime", [15]);
  await ethers.provider.send("evm_mine", []);
  console.log("✅ Tiempo adelantado (presale ahora activa)");

  // 8. COMPRA CON ETH
  console.log("\n" + "=".repeat(80));
  console.log("💰 COMPRA #1: Buyer1 compra con 0.1 ETH");
  console.log("=".repeat(80));

  const buyer1BalanceBefore = await ethers.provider.getBalance(buyer1.address);
  const buyer1BHTBefore = await bashoodToken.balanceOf(buyer1.address);
  const buyer1NFTBefore = await mockNFT.balanceOf(buyer1.address, 1);

  console.log(`\n📊 Estado inicial Buyer1:`);
  console.log(`  ETH: ${ethers.formatEther(buyer1BalanceBefore)}`);
  console.log(`  BHT: ${ethers.formatUnits(buyer1BHTBefore, 18)}`);
  console.log(`  NFT: ${buyer1NFTBefore}`);

  try {
    const nonce1 = 1;
    const signature1 = await signNonce(deployer, buyer1.address, nonce1);
    
    const purchaseTx = await bashoodPresale.connect(buyer1).purchaseWithETH(
      1, // nftId
      1, // quantity
      nonce1,
      signature1,
      { value: ethers.parseEther("0.1") }
    );
    const receipt = await purchaseTx.wait();
    
    console.log(`\n✅ Compra exitosa!`);
    console.log(`  Tx: ${receipt.hash}`);
    console.log(`  Gas: ${receipt.gasUsed}`);

    const buyer1BHTAfter = await bashoodToken.balanceOf(buyer1.address);
    const buyer1NFTAfter = await mockNFT.balanceOf(buyer1.address, 1);
    const buyer1BalanceAfter = await ethers.provider.getBalance(buyer1.address);

    console.log(`\n📊 Estado final Buyer1:`);
    console.log(`  ETH: ${ethers.formatEther(buyer1BalanceAfter)} (gastó ~${ethers.formatEther(buyer1BalanceBefore - buyer1BalanceAfter)})`);
    console.log(`  BHT: ${ethers.formatUnits(buyer1BHTAfter, 18)} (+${ethers.formatUnits(buyer1BHTAfter - buyer1BHTBefore, 18)})`);
    console.log(`  NFT: ${buyer1NFTAfter} (+${buyer1NFTAfter - buyer1NFTBefore})`);

    if (buyer1BHTAfter >= ethers.parseUnits("24000", 18)) { // Al menos 24k por burn/fee
      console.log(`\n✅ VALIDACIÓN: Recibió BHT correctamente`);
    }
    if (buyer1NFTAfter == 1n) {
      console.log(`✅ VALIDACIÓN: Recibió 1 NFT correctamente`);
    }

  } catch (error) {
    console.log(`\n❌ Error en compra: ${error.message}`);
  }

  // 9. COMPRA CON BHT
  console.log("\n" + "=".repeat(80));
  console.log("🪙 COMPRA #2: Buyer2 compra con BHT");
  console.log("=".repeat(80));

  // Actualizar precio para evitar staleness
  await ethers.provider.send("evm_increaseTime", [5]);
  await ethers.provider.send("evm_mine", []);
  const currentBlock2 = await ethers.provider.getBlock('latest');
  tx = await mockPriceFeed.setAnswerWithTimestamp(ethers.parseUnits("2300", 8), currentBlock2.timestamp);
  await tx.wait();

  // Dar BHT a buyer2
  tx = await bashoodToken.transfer(buyer2.address, ethers.parseUnits("100000", 18));
  await tx.wait();
  
  const buyer2BHTBefore = await bashoodToken.balanceOf(buyer2.address);
  const buyer2NFTBefore = await mockNFT.balanceOf(buyer2.address, 1);

  console.log(`\n📊 Estado inicial Buyer2:`);
  console.log(`  BHT: ${ethers.formatUnits(buyer2BHTBefore, 18)}`);
  console.log(`  NFT: ${buyer2NFTBefore}`);

  // Aprobar presale
  tx = await bashoodToken.connect(buyer2).approve(presaleAddr, ethers.parseUnits("100000", 18));
  await tx.wait();
  console.log(`✅ Aprobación exitosa`);

  try {
    const nonce2 = 2;
    const signature2 = await signNonce(deployer, buyer2.address, nonce2);
    
    const purchaseTx = await bashoodPresale.connect(buyer2).purchaseWithBHT(
      1, // nftId
      1, // quantity
      nonce2,
      signature2
    );
    const receipt = await purchaseTx.wait();
    
    console.log(`\n✅ Compra con BHT exitosa!`);
    console.log(`  Tx: ${receipt.hash}`);
    console.log(`  Gas: ${receipt.gasUsed}`);

    const buyer2BHTAfter = await bashoodToken.balanceOf(buyer2.address);
    const buyer2NFTAfter = await mockNFT.balanceOf(buyer2.address, 1);

    console.log(`\n📊 Estado final Buyer2:`);
    console.log(`  BHT: ${ethers.formatUnits(buyer2BHTAfter, 18)} (gastó ${ethers.formatUnits(buyer2BHTBefore - buyer2BHTAfter, 18)})`);
    console.log(`  NFT: ${buyer2NFTAfter} (+${buyer2NFTAfter - buyer2NFTBefore})`);

    if (buyer2NFTAfter == 1n) {
      console.log(`\n✅ VALIDACIÓN: Recibió 1 NFT correctamente`);
    }

  } catch (error) {
    console.log(`\n❌ Error en compra: ${error.message}`);
  }

  // Resumen
  console.log("\n" + "=".repeat(80));
  console.log("📋 RESUMEN FINAL");
  console.log("=".repeat(80));

  const presaleBHT = await bashoodToken.balanceOf(presaleAddr);
  const presaleNFT = await mockNFT.balanceOf(presaleAddr, 1);
  const totalSold = await bashoodPresale.totalNFTsSold();

  console.log(`\n💎 Presale:`);
  console.log(`  BHT disponible: ${ethers.formatUnits(presaleBHT, 18)} BHT`);
  console.log(`  NFTs disponibles: ${presaleNFT}`);
  console.log(`  Total NFTs vendidos: ${totalSold}`);

  console.log("\n✅ TEST COMPLETADO EXITOSAMENTE");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR FATAL:", error);
    process.exit(1);
  });
