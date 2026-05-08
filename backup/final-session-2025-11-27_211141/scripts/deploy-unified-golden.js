import hre from "hardhat";

const { ethers } = hre;

/**
 * Deploy Unificado - Golden House Collection Completa (8 NFTs)
 * 4 dorados + 4 neutros = 1 serie mecánica y sencilla
 */

async function main() {
    console.log("🌟 Deploying Unified Golden House Collection (8 NFTs)...\n");

    // Obtener signers (8 destinatarios diferentes)
    const [deployer, addr1, addr2, addr3, addr4, addr5, addr6, addr7] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Conectar al contrato existente o deployar nuevo
    const PropertyNFTFactory = await ethers.getContractFactory("BashoodPropertyNFT");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    let propertyContract;
    try {
        propertyContract = PropertyNFTFactory.attach(contractAddress);
        const name = await propertyContract.name();
        console.log(`✅ Connected to: ${name} at ${contractAddress}\n`);
    } catch (error) {
        console.log("⚠️  Deploying new contract...");
        const baseURI = "https://api.bashood.com/nft/unified-golden-collection/";
        propertyContract = await PropertyNFTFactory.deploy(baseURI);
        await propertyContract.waitForDeployment();
        console.log(`✅ New contract: ${await propertyContract.getAddress()}\n`);
    }

    // Definir las 8 propiedades unificadas (mecánico)
    const properties = [
        // Golden Subset (101-104)
        {
            tokenId: 101,
            name: "Golden Classic Manor",
            description: "Majestuosa mansión dorada con detalles en oro puro",
            location: "Golden District, Bashood City",
            propertyType: 5,
            area: 450,
            estimatedValue: "5000000",
            amenities: ["Golden Finish", "Crystal Windows", "Crown Roof"],
            imageHash: "QmGoldenClassic101"
        },
        {
            tokenId: 102,
            name: "Golden Prestige Estate",
            description: "Estate de prestigio con acabados dorados premium",
            location: "Prestige Heights, Bashood City",
            propertyType: 5,
            area: 500,
            estimatedValue: "6000000",
            amenities: ["Premium Gold", "Royal Windows", "Prestige Roof"],
            imageHash: "QmGoldenPrestige102"
        },
        {
            tokenId: 103,
            name: "Golden Heritage Villa",
            description: "Villa patrimonial con rica herencia dorada",
            location: "Heritage Golden Hills, Bashood City",
            propertyType: 5,
            area: 480,
            estimatedValue: "6500000",
            amenities: ["Heritage Gold", "Amber Windows", "Traditional Roof"],
            imageHash: "QmGoldenHeritage103"
        },
        {
            tokenId: 104,
            name: "Golden Rustic Retreat",
            description: "Refugio rústico dorado con elegancia natural",
            location: "Golden Nature Reserve, Bashood City",
            propertyType: 1,
            area: 380,
            estimatedValue: "5500000",
            amenities: ["Rustic Gold", "Warm Windows", "Natural Roof"],
            imageHash: "QmGoldenRustic104"
        },
        // Neutral Subset (105-108)
        {
            tokenId: 105,
            name: "Neutral Classic Estate",
            description: "Elegante residencia con base cobriza y ventanas verdes",
            location: "Serenity Gardens, Bashood City",
            propertyType: 1,
            area: 320,
            estimatedValue: "3500000",
            amenities: ["Copper Base", "Natural Windows", "White Roof"],
            imageHash: "QmNeutralClassic105"
        },
        {
            tokenId: 106,
            name: "Copper Elite Manor",
            description: "Mansión élite con base plateada y techo cobrizo",
            location: "Copper Heights, Bashood City",
            propertyType: 5,
            area: 420,
            estimatedValue: "4500000",
            amenities: ["Platinum Base", "Orange Windows", "Copper Roof"],
            imageHash: "QmCopperElite106"
        },
        {
            tokenId: 107,
            name: "Copper Tech Residence",
            description: "Residencia tecnológica con ventanas azul neón",
            location: "Innovation District, Bashood City",
            propertyType: 1,
            area: 380,
            estimatedValue: "5000000",
            amenities: ["Tech Copper", "Neon Windows", "Smart Roof"],
            imageHash: "QmCopperTech107"
        },
        {
            tokenId: 108,
            name: "Copper Heritage Mansion",
            description: "Mansión patrimonial con acabados cobrizos elegantes",
            location: "Heritage Hills, Bashood City",
            propertyType: 5,
            area: 390,
            estimatedValue: "4000000",
            amenities: ["Heritage Copper", "Golden Windows", "Dark Roof"],
            imageHash: "QmCopperHeritage108"
        }
    ];

    // Recipients (8 destinatarios para los 8 NFTs)
    const recipients = [
        deployer.address, addr1.address, addr2.address, addr3.address,
        addr4.address, addr5.address, addr6.address, addr7.address
    ];

    // Configurar precio de minting unificado
    try {
        const mintingFee = ethers.parseEther("1.0"); // 1.0 ETH para serie completa
        await propertyContract.setMintingFee(mintingFee);
        console.log(`💰 Minting fee set to: 1.0 ETH\n`);
    } catch (error) {
        console.log(`⚠️  Could not set minting fee: ${error.message}\n`);
    }

    const mintedNFTs = [];
    let totalValue = 0;

    // Mint mecánico de los 8 NFTs
    console.log(`🏠 Starting mechanical minting of 8 NFTs...\n`);

    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const recipient = recipients[i];
        const subset = i < 4 ? "Golden" : "Neutral";
        
        console.log(`🏠 [${i + 1}/8] ${subset} - ${property.name}`);
        console.log(`   💎 $${parseInt(property.estimatedValue).toLocaleString()} USD → ${recipient}`);

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

    // Configurar colección unificada
    try {
        await propertyContract.setPublicMintingEnabled(false); // Exclusivo por ahora
        console.log(`🔒 Public minting disabled for collection exclusivity\n`);
    } catch (error) {
        console.log(`⚠️  Could not configure collection: ${error.message}\n`);
    }

    // Summary completo
    console.log(`🎉 Unified Golden House Collection Completed!\n`);
    console.log(`🏗️  Contract: ${await propertyContract.getAddress()}`);
    console.log(`🏠 Total NFTs: ${mintedNFTs.length}/8`);
    console.log(`💰 Minting Fee: 1.0 ETH`);
    console.log(`💎 Total Value: $${totalValue.toLocaleString()} USD\n`);

    // Breakdown por subset
    const goldenNFTs = mintedNFTs.filter(nft => nft.subset === "Golden");
    const neutralNFTs = mintedNFTs.filter(nft => nft.subset === "Neutral");

    console.log(`🌟 Golden Subset (4 NFTs):`);
    goldenNFTs.forEach((nft, idx) => {
        console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name}`);
        console.log(`      💰 $${nft.value.toLocaleString()} USD`);
    });

    console.log(`\n🥉 Neutral Subset (4 NFTs):`);
    neutralNFTs.forEach((nft, idx) => {
        console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name}`);
        console.log(`      💰 $${nft.value.toLocaleString()} USD`);
    });

    // Verificación rápida
    try {
        const finalSupply = await propertyContract.totalSupply();
        console.log(`\n📊 Final Contract State:`);
        console.log(`   📈 Total Supply: ${finalSupply.toString()} NFTs`);
        console.log(`   💰 Avg Value: $${Math.round(totalValue / mintedNFTs.length).toLocaleString()} USD`);
    } catch (error) {
        console.log(`\n⚠️  Could not verify final state: ${error.message}`);
    }

    console.log(`\n✨ Unified collection mechanically deployed!`);
    console.log(`🔄 Ready for next batch of NFTs or series expansion.`);

    return {
        contractAddress: await propertyContract.getAddress(),
        mintedNFTs,
        totalValue,
        goldenCount: goldenNFTs.length,
        neutralCount: neutralNFTs.length
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });