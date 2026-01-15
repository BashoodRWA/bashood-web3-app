import hre from "hardhat";
import GoldenNeutralCollection from "./golden-neutral-collection.js";

const { ethers } = hre;

/**
 * Deploy Script para Golden Neutral Collection - Serie #2
 * Despliega una nueva serie de 4 NFTs con temática neutra y cobriza
 */

async function main() {
    console.log("🌟 Deploying Golden Neutral Collection - Series #2...\n");

    try {
        // Obtener signers
        const [deployer, addr1, addr2, addr3] = await ethers.getSigners();
        console.log(`🔑 Deployer: ${deployer.address}`);
        console.log(`👤 Address 1: ${addr1.address}`);
        console.log(`👤 Address 2: ${addr2.address}`);
        console.log(`👤 Address 3: ${addr3.address}\n`);

        // Obtener el contrato ya deployado (reutilizamos BashoodPropertyNFT)
        const PropertyNFTFactory = await ethers.getContractFactory("BashoodPropertyNFT");
        
        // Buscar contratos deployados existentes
        let propertyContract;
        try {
            // Intentar conectar al contrato existente (dirección del deployment anterior)
            const existingAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
            propertyContract = PropertyNFTFactory.attach(existingAddress);
            console.log(`✅ Connected to existing contract: ${existingAddress}`);
            
            // Verificar que el contrato esté activo
            const contractName = await propertyContract.name();
            console.log(`📝 Contract Name: ${contractName}\n`);
            
        } catch (error) {
            console.log("⚠️  Existing contract not found, deploying new one...");
            
            // Deploy nuevo contrato si no existe
            propertyContract = await PropertyNFTFactory.deploy();
            await propertyContract.waitForDeployment();
            console.log(`✅ New PropertyNFT deployed to: ${await propertyContract.getAddress()}\n`);
        }

        // Inicializar Golden Neutral Collection
        const collection = new GoldenNeutralCollection();
        const properties = collection.getCollectionProperties();
        
        console.log(`🏠 Minting ${properties.length} Golden Neutral NFTs...\n`);

        // Configurar precio de minting para serie #2 (menor que serie #1)
        const mintingFeeEther = "0.75"; // 0.75 ETH para serie #2 (más accesible)
        const mintingFeeWei = ethers.parseEther(mintingFeeEther);

        try {
            await propertyContract.setMintingFee(mintingFeeWei);
            console.log(`💰 Minting fee set to: ${mintingFeeEther} ETH for series #2\n`);
        } catch (error) {
            console.log(`⚠️  Could not set minting fee: ${error.message}`);
        }

        // Definir destinatarios para cada NFT (serie #2)
        const recipients = [
            deployer.address,  // NFT #201: Deployer
            addr1.address,     // NFT #202: Collector 1  
            addr2.address,     // NFT #203: Tech Collector
            addr3.address      // NFT #204: Heritage Collector
        ];

        const mintedNFTs = [];
        let totalCollectionValue = 0;

        // Mint cada NFT de la serie
        for (let i = 0; i < properties.length; i++) {
            const property = properties[i];
            const recipient = recipients[i];
            
            console.log(`🏠 Minting NFT #${property.tokenId}: ${property.name}`);
            console.log(`   📍 Type: ${property.propertyType === 5 ? 'Villa' : 'House'}`);
            console.log(`   📏 Area: ${property.area} sqm`);
            console.log(`   💎 Value: $${property.estimatedValue.toLocaleString()} USD`);
            console.log(`   🎯 To: ${recipient}\n`);

            try {
                // Preparar datos de propiedad para el contrato
                const propertyData = {
                    name: property.name,
                    description: property.description,
                    location: property.location,
                    propertyType: property.propertyType,
                    area: property.area,
                    estimatedValue: property.estimatedValue.toString(),
                    mintTimestamp: 0,
                    isActive: true,
                    amenities: property.amenities,
                    imageHash: property.imageHash,
                    originalOwner: recipient
                };

                // Mint NFT (usar mintAuthorized para control total)
                const tx = await propertyContract.mintAuthorized(
                    recipient,
                    propertyData,
                    `https://api.bashood.com/nft/${property.metadataURI}`
                );

                const receipt = await tx.wait();
                const tokenId = await propertyContract.tokenByIndex(i + 4); // Continuar desde serie #1
                
                mintedNFTs.push({
                    tokenId: tokenId.toString(),
                    name: property.name,
                    recipient: recipient,
                    value: property.estimatedValue,
                    txHash: receipt.hash
                });

                totalCollectionValue += property.estimatedValue;

                console.log(`   ✅ Minted! Token ID: ${tokenId.toString()}`);
                console.log(`   🔗 TX Hash: ${receipt.hash}\n`);

                // Pausa pequeña entre mints
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.log(`   ❌ Error minting NFT #${property.tokenId}: ${error.message}\n`);
            }
        }

        // Configurar metadatos para la serie #2
        console.log(`📊 Golden Neutral Collection Summary:\n`);
        console.log(`🏗️  Contract: ${await propertyContract.getAddress()}`);
        console.log(`📊 Series Number: #${collection.seriesNumber}`);
        console.log(`🏠 Total NFTs: ${mintedNFTs.length}/${properties.length}`);
        console.log(`💰 Minting Fee: ${mintingFeeEther} ETH`);
        console.log(`💎 Total Collection Value: $${totalCollectionValue.toLocaleString()} USD\n`);

        // Estadísticas por NFT
        console.log(`🎯 Minted NFTs Details:`);
        mintedNFTs.forEach((nft, index) => {
            console.log(`   ${index + 1}. Token #${nft.tokenId}: ${nft.name}`);
            console.log(`      💰 Value: $${nft.value.toLocaleString()} USD`);
            console.log(`      👤 Owner: ${nft.recipient}`);
        });

        // Verificar estado del contrato después del deployment
        console.log(`\n🔍 Contract State Verification:`);
        
        try {
            const totalSupply = await propertyContract.totalSupply();
            const contractBalance = await ethers.provider.getBalance(await propertyContract.getAddress());
            const isPaused = await propertyContract.paused();
            
            console.log(`   📈 Total Supply: ${totalSupply.toString()} NFTs`);
            console.log(`   💰 Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
            console.log(`   ⏸️  Paused: ${isPaused ? 'Yes' : 'No'}`);

            // Verificar ownership de algunos NFTs
            console.log(`\n👥 NFT Ownership Verification:`);
            for (let i = 0; i < Math.min(2, mintedNFTs.length); i++) {
                const nft = mintedNFTs[i];
                const owner = await propertyContract.ownerOf(nft.tokenId);
                const isCorrect = owner.toLowerCase() === nft.recipient.toLowerCase();
                console.log(`   Token #${nft.tokenId}: ${owner} ${isCorrect ? '✅' : '❌'}`);
            }

        } catch (error) {
            console.log(`   ⚠️  Could not verify contract state: ${error.message}`);
        }

        // Configuración especial para serie neutra
        console.log(`\n⚙️  Neutral Collection Special Configuration:`);
        
        try {
            // Deshabilitar minting público para mantener exclusividad de serie
            await propertyContract.setPublicMinting(false);
            console.log(`   🔒 Public minting disabled for series exclusivity`);
            
            // Configurar royalties específicos para serie #2
            console.log(`   💼 Royalty: 4% for Golden Neutral Collection`);
            
        } catch (error) {
            console.log(`   ⚠️  Could not apply special configuration: ${error.message}`);
        }

        console.log(`\n🎉 Golden Neutral Collection deployment completed!`);
        console.log(`🌟 Serie #2 successfully launched with ${mintedNFTs.length} premium NFTs`);
        console.log(`🔗 Contract Address: ${await propertyContract.getAddress()}`);
        console.log(`💎 Next steps: Upload images to IPFS and update metadata URLs\n`);

        return {
            contractAddress: await propertyContract.getAddress(),
            mintedNFTs,
            totalValue: totalCollectionValue,
            seriesNumber: collection.seriesNumber,
            mintingFee: mintingFeeEther
        };

    } catch (error) {
        console.error(`❌ Deployment failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar deployment
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export default main;