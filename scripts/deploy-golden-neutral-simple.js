import hre from "hardhat";

const { ethers } = hre;

/**
 * Deploy Script Simplificado para Golden Neutral Collection - Serie #2
 */

async function main() {
    console.log("🌟 Deploying Golden Neutral Collection - Series #2...\n");

    // Obtener signers
    const [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Conectar al contrato existente
    const PropertyNFTFactory = await ethers.getContractFactory("BashoodPropertyNFT");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    let propertyContract;
    try {
        propertyContract = PropertyNFTFactory.attach(contractAddress);
        const name = await propertyContract.name();
        console.log(`✅ Connected to contract: ${name} at ${contractAddress}\n`);
    } catch (error) {
        console.log("⚠️  Deploying new contract...");
        propertyContract = await PropertyNFTFactory.deploy();
        await propertyContract.waitForDeployment();
        console.log(`✅ New contract deployed at: ${await propertyContract.getAddress()}\n`);
    }

    // Definir propiedades de la Serie #2
    const properties = [
        {
            name: "Neutral Classic Estate",
            description: "Elegante residencia con base cobriza y ventanas verdes naturales",
            location: "Serenity Gardens, Bashood City",
            propertyType: 1,
            area: 320,
            estimatedValue: "3500000",
            amenities: ["Copper Base", "White Roof", "Natural Lighting"],
            imageHash: "QmNeutralClassic201"
        },
        {
            name: "Copper Elite Manor", 
            description: "Mansión de élite con base plateada y techo cobrizo",
            location: "Copper Heights, Bashood City",
            propertyType: 5,
            area: 420,
            estimatedValue: "4550000",
            amenities: ["Platinum Base", "Copper Roof", "Elite Lighting"],
            imageHash: "QmCopperElite202"
        },
        {
            name: "Copper Tech Residence",
            description: "Residencia tecnológica con ventanas azul neón",
            location: "Innovation District, Bashood City",
            propertyType: 1,
            area: 380,
            estimatedValue: "4900000",
            amenities: ["Tech Integration", "Neon Windows", "Smart Features"],
            imageHash: "QmCopperTech203"
        },
        {
            name: "Copper Heritage Mansion",
            description: "Mansión patrimonial con acabados cobrizos elegantes",
            location: "Heritage Hills, Bashood City",
            propertyType: 5,
            area: 390,
            estimatedValue: "4200000",
            amenities: ["Heritage Design", "Classic Windows", "Premium Materials"],
            imageHash: "QmCopperHeritage204"
        }
    ];

    // Recipients para cada NFT
    const recipients = [deployer.address, addr1.address, addr2.address, addr3.address];

    // Configurar precio de minting para serie #2
    try {
        const mintingFee = ethers.parseEther("0.75"); // 0.75 ETH
        await propertyContract.setMintingFee(mintingFee);
        console.log(`💰 Minting fee set to: 0.75 ETH\n`);
    } catch (error) {
        console.log(`⚠️  Could not set minting fee: ${error.message}\n`);
    }

    const mintedNFTs = [];
    let totalValue = 0;

    // Mint cada NFT
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const recipient = recipients[i];
        
        console.log(`🏠 Minting: ${property.name}`);
        console.log(`   💎 Value: $${parseInt(property.estimatedValue).toLocaleString()} USD`);
        console.log(`   🎯 To: ${recipient}`);

        try {
            const propertyData = {
                name: property.name,
                description: property.description,
                location: property.location,
                propertyType: property.propertyType,
                area: property.area,
                estimatedValue: property.estimatedValue,
                mintTimestamp: 0,
                isActive: true,
                amenities: property.amenities,
                imageHash: property.imageHash,
                originalOwner: recipient
            };

            const metadataURI = `https://api.bashood.com/nft/golden-neutral-collection/${201 + i}.json`;
            
            const tx = await propertyContract.mintAuthorized(
                recipient,
                propertyData,
                metadataURI
            );

            await tx.wait();
            
            // Obtener el token ID del último NFT minteado
            const totalSupply = await propertyContract.totalSupply();
            const tokenId = totalSupply.toString();

            mintedNFTs.push({
                tokenId,
                name: property.name,
                value: parseInt(property.estimatedValue)
            });

            totalValue += parseInt(property.estimatedValue);

            console.log(`   ✅ Minted! Token ID: ${tokenId}\n`);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }
    }

    // Summary
    console.log(`🎉 Golden Neutral Collection (Serie #2) Completed!\n`);
    console.log(`🏗️  Contract: ${await propertyContract.getAddress()}`);
    console.log(`🏠 NFTs Minted: ${mintedNFTs.length}/4`);
    console.log(`💎 Total Value: $${totalValue.toLocaleString()} USD`);
    console.log(`💰 Minting Fee: 0.75 ETH\n`);

    console.log(`📊 Minted NFTs:`);
    mintedNFTs.forEach((nft, index) => {
        console.log(`   ${index + 1}. Token #${nft.tokenId}: ${nft.name}`);
        console.log(`      💰 $${nft.value.toLocaleString()} USD`);
    });

    console.log(`\n✨ Serie #2 successfully deployed! Ready for the next collection.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });