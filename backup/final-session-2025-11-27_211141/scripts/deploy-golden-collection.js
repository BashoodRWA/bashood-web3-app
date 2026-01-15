import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import GoldenHouseCollection from "./golden-house-collection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = hre;

/**
 * Script de deployment específico para la Golden House Collection
 * Serie premium limitada de 4 NFTs únicos
 */

async function main() {
    console.log("✨ Deploying Golden House Collection - Premium NFT Series\n");
    
    const [deployer, collector1, collector2] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    
    // Inicializar la colección
    const goldenCollection = new GoldenHouseCollection();
    
    // Generar metadatos primero
    console.log("1. Generating Golden House Collection metadata...");
    const metadataResult = goldenCollection.saveAllMetadata();
    console.log("✅ Metadata generated successfully");
    
    // Conectar al contrato PropertyNFT desplegado
    console.log("\n2. Connecting to BashoodPropertyNFT contract...");
    
    const PropertyNFT = await ethers.getContractFactory("BashoodPropertyNFT");
    
    // Intenta usar un contrato ya desplegado o despliega uno nuevo
    let propertyNFT;
    const existingAddress = process.env.PROPERTY_NFT_ADDRESS;
    
    if (existingAddress) {
        console.log("   Using existing contract at:", existingAddress);
        propertyNFT = PropertyNFT.attach(existingAddress);
    } else {
        console.log("   Deploying new PropertyNFT contract...");
        const baseTokenURI = "https://api.bashood.com/nft/metadata/";
        propertyNFT = await PropertyNFT.deploy(baseTokenURI);
        await propertyNFT.waitForDeployment();
        console.log("   ✅ New PropertyNFT deployed at:", propertyNFT.target);
    }
    
    // Verificar permisos de minteo
    console.log("\n3. Setting up minting permissions...");
    const hasRole = await propertyNFT.authorizedMinters(deployer.address);
    
    if (!hasRole) {
        console.log("   Granting minter role...");
        const addMinterTx = await propertyNFT.addMinter(deployer.address);
        await addMinterTx.wait();
        console.log("   ✅ Minter role granted");
    } else {
        console.log("   ✅ Minter role already granted");
    }
    
    // Mint Golden House Collection
    console.log("\n4. Minting Golden House Collection NFTs...");
    
    const mintingData = goldenCollection.getContractMintingData();
    const mintedTokens = [];
    
    // Definir a quién se van a mintear (puede ser el deployer o coleccionistas específicos)
    const recipients = [
        deployer.address,  // Golden Classic Manor
        collector1.address, // Golden Prestige Estate  
        collector2.address, // Golden Heritage Villa
        deployer.address   // Golden Rustic Retreat (más raro, va al deployer)
    ];
    
    for (let i = 0; i < mintingData.length; i++) {
        const mintData = mintingData[i];
        const recipient = recipients[i] || deployer.address;
        
        console.log(`   Minting ${mintData.propertyData.name} for ${recipient}...`);
        
        try {
            // Preparar property data con valores correctos
            const propertyData = {
                name: mintData.propertyData.name,
                description: mintData.propertyData.description,
                location: mintData.propertyData.location,
                propertyType: mintData.propertyData.propertyType,
                area: mintData.propertyData.area,
                estimatedValue: mintData.propertyData.estimatedValue,
                mintTimestamp: 0,
                isActive: true,
                amenities: mintData.propertyData.amenities,
                imageHash: mintData.propertyData.imageHash,
                originalOwner: "0x0000000000000000000000000000000000000000"
            };
            
            const mintTx = await propertyNFT.mintProperty(
                recipient,
                propertyData,
                mintData.customTokenURI
            );
            
            const receipt = await mintTx.wait();
            
            // Capturar token ID del evento
            const transferEvent = receipt.logs?.find(log => {
                try {
                    const parsed = propertyNFT.interface.parseLog(log);
                    return parsed && parsed.name === 'Transfer';
                } catch {
                    return false;
                }
            });
            
            let tokenId = "unknown";
            if (transferEvent) {
                const parsed = propertyNFT.interface.parseLog(transferEvent);
                tokenId = parsed.args?.tokenId?.toString();
            }
            
            mintedTokens.push({
                tokenId: tokenId,
                name: mintData.propertyData.name,
                recipient: recipient,
                value: mintData.propertyData.estimatedValue,
                txHash: receipt.hash
            });
            
            console.log(`   ✅ Token ID ${tokenId} minted successfully`);
            
        } catch (error) {
            console.log(`   ❌ Failed to mint ${mintData.propertyData.name}:`, error.message);
        }
    }
    
    // Configuración especial para la Golden Collection
    console.log("\n5. Configuring Golden Collection special settings...");
    
    try {
        // Establecer precio premium para minting público (si está habilitado)
        const premiumPrice = ethers.parseEther("1.0"); // 1 ETH para colección premium
        const setPriceTx = await propertyNFT.setMintingFee(premiumPrice);
        await setPriceTx.wait();
        console.log("   ✅ Premium minting fee set to 1.0 ETH");
        
        // Opcional: Pausar minting público para mantener exclusividad
        const pausePublicTx = await propertyNFT.setPublicMintingEnabled(false);
        await pausePublicTx.wait();
        console.log("   ✅ Public minting disabled for exclusivity");
        
    } catch (error) {
        console.log("   ⚠️ Could not set premium configuration:", error.message);
    }
    
    // Estadísticas finales
    console.log("\n✨ Golden House Collection Deployment Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🏠 Contract: ${propertyNFT.target}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`📦 Collection: ${goldenCollection.seriesName}`);
    console.log(`🎯 Total Minted: ${mintedTokens.length}/${goldenCollection.totalSupply}`);
    console.log(`💰 Total Collection Value: $${metadataResult.totalValue.toLocaleString()} USD`);
    
    if (mintedTokens.length > 0) {
        console.log(`\n🏆 Minted Golden House NFTs:`);
        mintedTokens.forEach((token, index) => {
            console.log(`   ${index + 1}. #${token.tokenId} "${token.name}"`);
            console.log(`      Owner: ${token.recipient}`);
            console.log(`      Value: $${parseInt(token.value).toLocaleString()} USD`);
        });
    }
    
    // Verificar estado del contrato
    console.log("\n📊 Contract State:");
    try {
        const totalSupply = await propertyNFT.totalSupply();
        const contractBalance = await ethers.provider.getBalance(propertyNFT.target);
        const mintingFee = await propertyNFT.mintingFee();
        const publicEnabled = await propertyNFT.publicMintingEnabled();
        
        console.log(`   Total NFTs: ${totalSupply}`);
        console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
        console.log(`   Minting Fee: ${ethers.formatEther(mintingFee)} ETH`);
        console.log(`   Public Minting: ${publicEnabled ? "Enabled" : "Disabled"}`);
        
    } catch (error) {
        console.log("   ❌ Could not fetch contract state");
    }
    
    // Guardar información de deployment
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: propertyNFT.target,
        deployer: deployer.address,
        collectionName: goldenCollection.seriesName,
        totalSupply: goldenCollection.totalSupply,
        mintedTokens: mintedTokens,
        metadataPath: metadataResult.outputDir,
        deploymentTime: new Date().toISOString(),
        collectionValue: metadataResult.totalValue,
        premiumSettings: {
            mintingFee: "1.0 ETH",
            publicMinting: false,
            rarity: "LEGENDARY"
        }
    };
    
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `golden-house-collection-${hre.network.name}-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n💾 Deployment info saved: ${deploymentFile}`);
    
    // Instrucciones de next steps
    console.log("\n🚀 Next Steps for Golden House Collection:");
    console.log("1. Upload images to IPFS with the generated hashes");
    console.log("2. Update metadata URLs to point to IPFS");
    console.log("3. Configure collection on OpenSea/Marketplace");
    console.log("4. Set up premium marketing campaign");
    console.log("5. Enable Golden Circle VIP access");
    console.log("6. Configure staking rewards for collection holders");
    
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n🔍 Verify contract:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${propertyNFT.target} "https://api.bashood.com/nft/metadata/"`);
    }
    
    console.log("\n🎉 Golden House Collection deployment completed successfully!");
    
    return {
        contractAddress: propertyNFT.target,
        mintedTokens: mintedTokens,
        collectionValue: metadataResult.totalValue,
        deploymentInfo: deploymentInfo
    };
}

// Manejo de errores mejorado
main()
    .then((result) => {
        console.log(`\n✨ Golden House Collection successfully deployed!`);
        console.log(`📍 Contract: ${result.contractAddress}`);
        console.log(`💰 Total Value: $${result.collectionValue.toLocaleString()} USD`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Golden House Collection deployment failed:");
        console.error(error);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error("❌ Insufficient funds for deployment and minting");
        } else if (error.message.includes('revert')) {
            console.error("❌ Transaction reverted - check contract permissions");
        } else if (error.message.includes('network')) {
            console.error("❌ Network error - check connection and configuration");
        }
        
        process.exit(1);
    });