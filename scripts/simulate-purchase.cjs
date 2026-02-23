const hre = require("hardhat");
const ethers = hre.ethers;

// Direcciones de los contratos desplegados (actualizar según deployment)
const DEPLOYED_ADDRESSES = {
  bashoodToken: "0x04C89607413713Ec9775E14b954286519d836FEf",
  bashoodPresale: "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD",
  mockNFT: "0x4C4a2f8c81640e47606d3fd77B353E87Ba015584",
  mockPriceFeed: "0x21dF544947ba3E8b3c32561399E88B52Dc8b2823"
};

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🛒 SIMULACIÓN DE COMPRA EN PRESALE");
  console.log("=".repeat(80));

  // Obtener signers
  const [deployer, buyer1, buyer2] = await ethers.getSigners();
  
  console.log("\n📋 Configuración:");
  console.log(`  Network: ${hre.network.name}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Buyer 1: ${buyer1.address}`);
  console.log(`  Buyer 2: ${buyer2.address}`);

  // Conectar con contratos desplegados
  console.log("\n🔗 Conectando con contratos...");
  const BashoodToken = await ethers.getContractFactory("BashoodToken");
  const bashoodToken = BashoodToken.attach(DEPLOYED_ADDRESSES.bashoodToken);

  const BashoodPresale = await ethers.getContractFactory("BashoodPresaleFinal");
  const bashoodPresale = BashoodPresale.attach(DEPLOYED_ADDRESSES.bashoodPresale);

  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const mockNFT = MockNFT.attach(DEPLOYED_ADDRESSES.mockNFT);

  console.log("✅ Contratos conectados");

  // Verificar estado inicial
  console.log("\n" + "=".repeat(80));
  console.log("📊 ESTADO INICIAL");
  console.log("=".repeat(80));

  const totalSupply = await bashoodToken.totalSupply();
  const presaleBHTBalance = await bashoodToken.balanceOf(DEPLOYED_ADDRESSES.bashoodPresale);
  const presaleNFTBalance = await mockNFT.balanceOf(DEPLOYED_ADDRESSES.bashoodPresale, 1);
  const buyer1ETHBefore = await ethers.provider.getBalance(buyer1.address);

  console.log(`\n  BHT Total Supply: ${ethers.formatUnits(totalSupply, 18)} BHT`);
  console.log(`  Presale BHT Balance: ${ethers.formatUnits(presaleBHTBalance, 18)} BHT`);
  console.log(`  Presale NFT Balance: ${presaleNFTBalance} NFTs (ID #1)`);
  console.log(`  Buyer1 ETH Balance: ${ethers.formatEther(buyer1ETHBefore)} ETH`);

  // Activar presale si no está activa
  console.log("\n🔄 Verificando estado de la presale...");
  try {
    const isActive = await bashoodPresale.presaleActive();
    const presaleStart = await bashoodPresale.presaleStart();
    const presaleEnd = await bashoodPresale.presaleEnd();
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    
    console.log(`  Presale Active Flag: ${isActive}`);
    console.log(`  Presale Start: ${presaleStart}`);
    console.log(`  Presale End: ${presaleEnd}`);
    console.log(`  Current Time: ${currentTime}`);

    // Verificar si estamos dentro del rango de tiempo (convert BigInt to Number for comparison)
    const startNum = Number(presaleStart);
    const endNum = Number(presaleEnd);
    const currentNum = Number(currentTime);
    
    if (startNum !== 0 || endNum !== 0) {
      if (currentNum < startNum) {
        console.log(`\n  ⚠️ La presale aún no ha comenzado (faltan ${startNum - currentNum} segundos)`);
        console.log("  🔄 Adelantando tiempo del blockchain...");
        await ethers.provider.send("evm_increaseTime", [startNum - currentNum + 1]);
        await ethers.provider.send("evm_mine", []);
        console.log("  ✅ Tiempo adelantado");
      } else if (currentNum > endNum) {
        console.log(`\n  ⚠️ La presale ya terminó (terminó hace ${currentNum - endNum} segundos)`);
        console.log("  🔧 Extendiendo período de presale...");
        // No hay función para extender, así que vamos a usar evm_setNextBlockTimestamp
        const newTime = startNum + 60; // 60 segundos después del inicio
        await ethers.provider.send("evm_setNextBlockTimestamp", [newTime]);
        await ethers.provider.send("evm_mine", []);
        console.log(`  ✅ Tiempo ajustado a ${newTime} (dentro del rango de presale)`);
      } else {
        console.log("  ✅ Presale está en el rango de tiempo correcto");
      }
    } else if (!isActive) {
      console.log("\n  🔧 Activando presale con flag...");
      const startTx = await bashoodPresale.connect(deployer).startPresale();
      await startTx.wait();
      console.log("  ✅ Presale activada correctamente");
    } else {
      console.log("  ✅ Presale ya está activa");
    }
  } catch (error) {
    console.log(`  ⚠️ Error activando presale: ${error.message}`);
  }

  // COMPRA 1: Con ETH (Buyer 1)
  console.log("\n" + "=".repeat(80));
  console.log("💰 COMPRA #1: Buyer1 compra con 0.1 ETH");
  console.log("=".repeat(80));

  const ethAmount = ethers.parseEther("0.1"); // 0.1 ETH
  const expectedBHT = ethers.parseUnits("25000", 18); // 25,000 BHT
  const nftId = 1;
  const quantity = 1;
  const nonce = 1;
  const signature = "0x"; // Firma vacía para localhost (cadena vacía en bytes)

  console.log(`\n  Parámetros:`);
  console.log(`    ETH enviado: 0.1 ETH`);
  console.log(`    BHT esperado: 25,000 BHT`);
  console.log(`    NFT ID: ${nftId}`);
  console.log(`    Cantidad: ${quantity}`);

  try {
    const tx = await bashoodPresale.connect(buyer1).purchaseWithETH(
      nftId,
      quantity,
      nonce,
      signature,
      { value: ethAmount }
    );
    
    const receipt = await tx.wait();
    console.log(`\n✅ Compra exitosa!`);
    console.log(`  Transaction hash: ${receipt.hash}`);
    console.log(`  Gas usado: ${receipt.gasUsed.toString()}`);
    console.log(`  Block: #${receipt.blockNumber}`);

    // Verificar balances después de la compra
    const buyer1BHTAfter = await bashoodToken.balanceOf(buyer1.address);
    const buyer1NFTAfter = await mockNFT.balanceOf(buyer1.address, nftId);
    const buyer1ETHAfter = await ethers.provider.getBalance(buyer1.address);
    const presaleBHTAfter = await bashoodToken.balanceOf(DEPLOYED_ADDRESSES.bashoodPresale);
    const presaleNFTAfter = await mockNFT.balanceOf(DEPLOYED_ADDRESSES.bashoodPresale, 1);

    console.log(`\n📊 Resultados:`);
    console.log(`  Buyer1 BHT: ${ethers.formatUnits(buyer1BHTAfter, 18)} BHT`);
    console.log(`  Buyer1 NFT: ${buyer1NFTAfter} NFTs (ID #${nftId})`);
    console.log(`  Buyer1 ETH gastado: ${ethers.formatEther(buyer1ETHBefore - buyer1ETHAfter)} ETH (aprox.)`);
    console.log(`  Presale BHT restante: ${ethers.formatUnits(presaleBHTAfter, 18)} BHT`);
    console.log(`  Presale NFT restante: ${presaleNFTAfter} NFTs`);

    // Validar que recibió la cantidad correcta
    if (buyer1BHTAfter >= expectedBHT) {
      console.log(`\n✅ VALIDACIÓN: Recibió ${ethers.formatUnits(buyer1BHTAfter, 18)} BHT (esperado: 25,000)`);
    } else {
      console.log(`\n❌ ERROR: Recibió ${ethers.formatUnits(buyer1BHTAfter, 18)} BHT (esperado: 25,000)`);
    }

    if (buyer1NFTAfter == quantity) {
      console.log(`✅ VALIDACIÓN: Recibió ${buyer1NFTAfter} NFT (esperado: ${quantity})`);
    } else {
      console.log(`❌ ERROR: Recibió ${buyer1NFTAfter} NFT (esperado: ${quantity})`);
    }

  } catch (error) {
    console.log(`\n❌ Error en compra: ${error.message}`);
    if (error.data) {
      console.log(`   Error data: ${error.data}`);
    }
  }

  // COMPRA 2: Con BHT (Buyer 2)
  console.log("\n" + "=".repeat(80));
  console.log("🪙 COMPRA #2: Buyer2 compra con BHT");
  console.log("=".repeat(80));

  // Primero, dar BHT a buyer2 para que pueda comprar
  const bhtForBuyer2 = ethers.parseUnits("100000", 18); // 100k BHT
  
  try {
    console.log(`\n  Transfiriendo 100,000 BHT a Buyer2...`);
    const transferTx = await bashoodToken.connect(deployer).transfer(buyer2.address, bhtForBuyer2);
    await transferTx.wait();
    
    const buyer2BHTBefore = await bashoodToken.balanceOf(buyer2.address);
    console.log(`  ✅ Buyer2 BHT: ${ethers.formatUnits(buyer2BHTBefore, 18)} BHT`);

    // Aprobar presale para gastar BHT
    console.log(`\n  Aprobando presale para gastar BHT...`);
    const approveTx = await bashoodToken.connect(buyer2).approve(
      DEPLOYED_ADDRESSES.bashoodPresale,
      bhtForBuyer2
    );
    await approveTx.wait();
    console.log(`  ✅ Aprobación exitosa`);

    // Calcular cuánto BHT se necesita para 1 NFT
    // Asumiendo precio de NFT en BHT (nftPriceBHT del contrato)
    const nftPriceBHT = await bashoodPresale.nftPriceBHT();
    console.log(`\n  Precio NFT: ${ethers.formatUnits(nftPriceBHT, 18)} BHT`);

    console.log(`\n  Comprando NFT con BHT...`);
    const purchaseBHTTx = await bashoodPresale.connect(buyer2).purchaseWithBHT(
      nftId,
      quantity,
      nonce + 1,
      signature
    );
    
    const receiptBHT = await purchaseBHTTx.wait();
    console.log(`\n✅ Compra con BHT exitosa!`);
    console.log(`  Transaction hash: ${receiptBHT.hash}`);
    console.log(`  Gas usado: ${receiptBHT.gasUsed.toString()}`);

    // Verificar balances después
    const buyer2BHTAfter = await bashoodToken.balanceOf(buyer2.address);
    const buyer2NFTAfter = await mockNFT.balanceOf(buyer2.address, nftId);
    const bhtSpent = buyer2BHTBefore - buyer2BHTAfter;

    console.log(`\n📊 Resultados:`);
    console.log(`  Buyer2 BHT gastado: ${ethers.formatUnits(bhtSpent, 18)} BHT`);
    console.log(`  Buyer2 BHT restante: ${ethers.formatUnits(buyer2BHTAfter, 18)} BHT`);
    console.log(`  Buyer2 NFT: ${buyer2NFTAfter} NFTs (ID #${nftId})`);

    if (buyer2NFTAfter == quantity) {
      console.log(`\n✅ VALIDACIÓN: Recibió ${buyer2NFTAfter} NFT con BHT`);
    }

  } catch (error) {
    console.log(`\n❌ Error en compra con BHT: ${error.message}`);
    if (error.data) {
      console.log(`   Error data: ${error.data}`);
    }
  }

  // Resumen final
  console.log("\n" + "=".repeat(80));
  console.log("📋 RESUMEN FINAL");
  console.log("=".repeat(80));

  const finalPresaleBHT = await bashoodToken.balanceOf(DEPLOYED_ADDRESSES.bashoodPresale);
  const finalPresaleNFT = await mockNFT.balanceOf(DEPLOYED_ADDRESSES.bashoodPresale, 1);
  const finalBuyer1BHT = await bashoodToken.balanceOf(buyer1.address);
  const finalBuyer1NFT = await mockNFT.balanceOf(buyer1.address, nftId);
  const finalBuyer2BHT = await bashoodToken.balanceOf(buyer2.address);
  const finalBuyer2NFT = await mockNFT.balanceOf(buyer2.address, nftId);

  console.log(`\n💎 Presale:`);
  console.log(`  BHT disponible: ${ethers.formatUnits(finalPresaleBHT, 18)} BHT`);
  console.log(`  NFTs disponibles: ${finalPresaleNFT} (ID #1)`);

  console.log(`\n👤 Buyer1 (compra ETH):`);
  console.log(`  BHT: ${ethers.formatUnits(finalBuyer1BHT, 18)} BHT`);
  console.log(`  NFTs: ${finalBuyer1NFT}`);

  console.log(`\n👤 Buyer2 (compra BHT):`);
  console.log(`  BHT: ${ethers.formatUnits(finalBuyer2BHT, 18)} BHT`);
  console.log(`  NFTs: ${finalBuyer2NFT}`);

  console.log("\n" + "=".repeat(80));
  console.log("✅ SIMULACIÓN COMPLETADA");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR FATAL:", error);
    process.exit(1);
  });
