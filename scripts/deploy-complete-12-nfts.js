import hre from "hardhat";

const { ethers } = hre;

/**
 * Deploy Completo - Golden House Collection (12 NFTs)
 * Deployment directo de toda la colección expandida
 */

async function main() {
    console.log("🌟 Deploying Complete Golden House Collection (12 NFTs)...\n");

    // Obtener signers
    const [deployer, ...addrs] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Deploy nuevo contrato
    const PropertyNFTFactory = await ethers.getContractFactory("BashoodPropertyNFT");
    const baseURI = "https://api.bashood.com/nft/unified-golden-collection/";
    
    console.log("⚠️  Deploying new contract...");
    const propertyContract = await PropertyNFTFactory.deploy(baseURI);
    await propertyContract.waitForDeployment();
    const contractAddress = await propertyContract.getAddress();
    console.log(`✅ New contract: ${contractAddress}\n`);

    // Definir todos los 12 NFTs en una sola serie
    const allProperties = [
        // Original Golden Subset (1-4)
        {
            tokenId: 101, name: "Golden Classic Manor", description: "Majestuosa mansión dorada con detalles en oro puro",
            location: "Golden District, Bashood City", propertyType: 5, area: 450, estimatedValue: "5000000",
            amenities: ["Golden Finish", "Crystal Windows", "Crown Roof"], imageHash: "QmGoldenClassic101"
        },
        {
            tokenId: 102, name: "Golden Prestige Estate", description: "Estate de prestigio con acabados dorados premium",
            location: "Prestige Heights, Bashood City", propertyType: 5, area: 500, estimatedValue: "6000000",
            amenities: ["Premium Gold", "Royal Windows", "Prestige Roof"], imageHash: "QmGoldenPrestige102"
        },
        {
            tokenId: 103, name: "Golden Heritage Villa", description: "Villa patrimonial con rica herencia dorada",
            location: "Heritage Golden Hills, Bashood City", propertyType: 5, area: 480, estimatedValue: "6500000",
            amenities: ["Heritage Gold", "Amber Windows", "Traditional Roof"], imageHash: "QmGoldenHeritage103"
        },
        {
            tokenId: 104, name: "Golden Rustic Retreat", description: "Refugio rústico dorado con elegancia natural",
            location: "Golden Nature Reserve, Bashood City", propertyType: 1, area: 380, estimatedValue: "5500000",
            amenities: ["Rustic Gold", "Warm Windows", "Natural Roof"], imageHash: "QmGoldenRustic104"
        },
        
        // Original Neutral Subset (5-8)
        {
            tokenId: 105, name: "Neutral Classic Estate", description: "Elegante residencia con base cobriza y ventanas verdes",
            location: "Serenity Gardens, Bashood City", propertyType: 1, area: 320, estimatedValue: "3500000",
            amenities: ["Copper Base", "Natural Windows", "White Roof"], imageHash: "QmNeutralClassic105"
        },
        {
            tokenId: 106, name: "Copper Elite Manor", description: "Mansión élite con base plateada y techo cobrizo",
            location: "Copper Heights, Bashood City", propertyType: 5, area: 420, estimatedValue: "4500000",
            amenities: ["Platinum Base", "Orange Windows", "Copper Roof"], imageHash: "QmCopperElite106"
        },
        {
            tokenId: 107, name: "Copper Tech Residence", description: "Residencia tecnológica con ventanas azul neón",
            location: "Innovation District, Bashood City", propertyType: 1, area: 380, estimatedValue: "5000000",
            amenities: ["Tech Copper", "Neon Windows", "Smart Roof"], imageHash: "QmCopperTech107"
        },
        {
            tokenId: 108, name: "Copper Heritage Mansion", description: "Mansión patrimonial con acabados cobrizos elegantes",
            location: "Heritage Hills, Bashood City", propertyType: 5, area: 390, estimatedValue: "4000000",
            amenities: ["Heritage Copper", "Golden Windows", "Dark Roof"], imageHash: "QmCopperHeritage108"
        },

        // New Tech Subset (9-12)
        {
            tokenId: 109, name: "Modern Tech Estate", description: "Casa tecnológica moderna con base plateada elegante",
            location: "Tech Valley, Bashood City", propertyType: 1, area: 350, estimatedValue: "4800000",
            amenities: ["Silver Base", "Green Tech Windows", "White Roof"], imageHash: "QmModernTech109"
        },
        {
            tokenId: 110, name: "Purple Innovation House", description: "Residencia innovadora con ventanas púrpura neón",
            location: "Innovation Hub, Bashood City", propertyType: 1, area: 340, estimatedValue: "5200000",
            amenities: ["Silver Base", "Purple Neon Windows", "Metal Roof"], imageHash: "QmPurpleInnovation110"
        },
        {
            tokenId: 111, name: "Golden Marble Mansion", description: "Lujosa mansión de mármol blanco con base dorada premium",
            location: "Marble Heights, Bashood City", propertyType: 5, area: 520, estimatedValue: "7500000",
            amenities: ["Golden Base", "Royal Blue Windows", "Marble Walls"], imageHash: "QmGoldenMarble111"
        },
        {
            tokenId: 112, name: "Classic Tech Residence", description: "Residencia clásica tecnológica con tradición y modernidad",
            location: "Classic Tech District, Bashood City", propertyType: 1, area: 360, estimatedValue: "4600000",
            amenities: ["Silver Base", "Eco Green Windows", "Classic Roof"], imageHash: "QmClassicTech112"
        }
    ];

    // Recipients para los 12 NFTs
    const recipients = [];
    for (let i = 0; i < 12; i++) {
        recipients.push(addrs[i]?.address || deployer.address);
    }

    // Configurar precio de minting
    try {
        const mintingFee = ethers.parseEther("1.0");
        await propertyContract.setMintingFee(mintingFee);
        console.log(`💰 Minting fee set to: 1.0 ETH\n`);
    } catch (error) {
        console.log(`⚠️  Could not set minting fee: ${error.message}\n`);
    }

    const mintedNFTs = [];
    let totalValue = 0;

    console.log(`🏠 Starting mechanical minting of 12 NFTs...\n`);

    // Mint mecánico de todos los 12 NFTs
    for (let i = 0; i < allProperties.length; i++) {
        const property = allProperties[i];
        const recipient = recipients[i];
        
        // Determinar subset
        let subset = "Unknown";
        if (i < 4) subset = "Golden";
        else if (i < 8) subset = "Neutral"; 
        else subset = "Tech";
        
        console.log(`🏠 [${i + 1}/12] ${subset} - ${property.name}`);
        console.log(`   💎 $${parseInt(property.estimatedValue).toLocaleString()} USD → ${recipient.slice(0,6)}...`);

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

            const metadataURI = `https://api.bashood.com/nft/unified-golden-collection/${property.tokenId}.json`;
            
            const tx = await propertyContract.mintProperty(recipient, propertyData, metadataURI);
            await tx.wait();
            
            const totalSupply = await propertyContract.totalSupply();
            const tokenId = totalSupply.toString();

            mintedNFTs.push({
                tokenId,
                conceptId: property.tokenId,
                name: property.name,
                subset,
                value: parseInt(property.estimatedValue)
            });

            totalValue += parseInt(property.estimatedValue);
            console.log(`   ✅ Token ID: ${tokenId}\n`);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }
    }

    // Configurar colección
    try {
        await propertyContract.setPublicMintingEnabled(false);
        console.log(`🔒 Public minting disabled for collection exclusivity\n`);
    } catch (error) {
        console.log(`⚠️  Could not configure collection: ${error.message}\n`);
    }

    // Summary completo
    console.log(`🎉 Complete Golden House Collection Deployed!\n`);
    console.log(`🏗️  Contract: ${contractAddress}`);
    console.log(`🏠 Total NFTs: ${mintedNFTs.length}/12`);
    console.log(`💰 Minting Fee: 1.0 ETH`);
    console.log(`💎 Total Value: $${totalValue.toLocaleString()} USD\n`);

    // Breakdown por subsets
    const goldenNFTs = mintedNFTs.filter(nft => nft.subset === "Golden");
    const neutralNFTs = mintedNFTs.filter(nft => nft.subset === "Neutral");
    const techNFTs = mintedNFTs.filter(nft => nft.subset === "Tech");

    console.log(`🌟 Golden Subset (${goldenNFTs.length} NFTs):`);
    goldenNFTs.forEach((nft, idx) => {
        console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name} - $${nft.value.toLocaleString()}`);
    });

    console.log(`\n🥉 Neutral Subset (${neutralNFTs.length} NFTs):`);
    neutralNFTs.forEach((nft, idx) => {
        console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name} - $${nft.value.toLocaleString()}`);
    });

    console.log(`\n🔮 Tech Subset (${techNFTs.length} NFTs):`);
    techNFTs.forEach((nft, idx) => {
        console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name} - $${nft.value.toLocaleString()}`);
    });

    // Verificación final
    try {
        const finalSupply = await propertyContract.totalSupply();
        console.log(`\n📊 Final Collection State:`);
        console.log(`   📈 Total Supply: ${finalSupply.toString()} NFTs`);
        console.log(`   💰 Total Value: $${totalValue.toLocaleString()} USD`);
        console.log(`   📊 Avg Value: $${Math.round(totalValue / mintedNFTs.length).toLocaleString()} USD`);
    } catch (error) {
        console.log(`\n⚠️  Could not verify final state: ${error.message}`);
    }

    console.log(`\n✨ Complete collection of 12 premium NFTs deployed!`);
    console.log(`🔄 Ready for marketplace launch or next collection series.`);

    return {
        contractAddress,
        mintedNFTs,
        totalValue,
        subsetCounts: {
            golden: goldenNFTs.length,
            neutral: neutralNFTs.length,
            tech: techNFTs.length
        }
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });