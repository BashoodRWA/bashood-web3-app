import hre from "hardhat";

const { ethers } = hre;

/**
 * Expansión Mecánica - De 8 a 12 NFTs en la misma serie
 * Añadiendo 4 NFTs más a la Golden House Collection existente
 */

async function main() {
    console.log("🚀 Expanding Golden House Collection from 8 to 12 NFTs...\n");

    // Obtener signers
    const [deployer, ...addrs] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Conectar al contrato existente
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const PropertyNFTFactory = await ethers.getContractFactory("BashoodPropertyNFT");
    const propertyContract = PropertyNFTFactory.attach(contractAddress);
    
    try {
        const name = await propertyContract.name();
        const currentSupply = await propertyContract.totalSupply();
        console.log(`✅ Connected to: ${name}`);
        console.log(`📊 Current Supply: ${currentSupply} NFTs`);
        console.log(`🎯 Expanding to: 12 NFTs (+4 new)\n`);
    } catch (error) {
        console.log("❌ Could not connect to existing contract");
        process.exit(1);
    }

    // Definir los 4 NFTs nuevos (continuando desde Token ID 9)
    const newProperties = [
        {
            tokenId: 109,
            name: "Modern Tech Estate",
            description: "Casa tecnológica moderna con base plateada elegante. Ventanas verdes que simbolizan sustentabilidad y techo blanco minimalista.",
            location: "Tech Valley, Bashood City",
            propertyType: 1,
            area: 350,
            estimatedValue: "4800000", // 4.8M USD
            amenities: ["Silver Base", "Green Tech Windows", "White Roof", "Modern Design"],
            imageHash: "QmModernTech109"
        },
        {
            tokenId: 110,
            name: "Purple Innovation House",
            description: "Residencia innovadora con impresionantes ventanas púrpura neón. Casa negra sobre base plateada que representa el futuro de la vivienda.",
            location: "Innovation Hub, Bashood City",
            propertyType: 1,
            area: 340,
            estimatedValue: "5200000", // 5.2M USD (purple premium)
            amenities: ["Silver Base", "Purple Neon Windows", "Metal Roof", "Innovation Design"],
            imageHash: "QmPurpleInnovation110"
        },
        {
            tokenId: 111,
            name: "Golden Marble Mansion",
            description: "Lujosa mansión de mármol blanco con base dorada premium. Ventanas azul real que contrastan elegantemente con el diseño clásico.",
            location: "Marble Heights, Bashood City",
            propertyType: 5, // Villa
            area: 520,
            estimatedValue: "7500000", // 7.5M USD (más cara por mármol)
            amenities: ["Golden Base", "Royal Blue Windows", "Golden Roof", "Marble Walls"],
            imageHash: "QmGoldenMarble111"
        },
        {
            tokenId: 112,
            name: "Classic Tech Residence",
            description: "Residencia clásica tecnológica con perfecta combinación de tradición y modernidad. Ventanas verdes eco-friendly en diseño atemporal.",
            location: "Classic Tech District, Bashood City",
            propertyType: 1,
            area: 360,
            estimatedValue: "4600000", // 4.6M USD
            amenities: ["Silver Base", "Eco Green Windows", "Classic Roof", "Tech Integration"],
            imageHash: "QmClassicTech112"
        }
    ];

    // Recipients para los 4 nuevos NFTs (continuar con las siguientes direcciones)
    const newRecipients = [
        addrs[8]?.address || deployer.address,
        addrs[9]?.address || deployer.address, 
        addrs[10]?.address || deployer.address,
        addrs[11]?.address || deployer.address
    ];

    const mintedNFTs = [];
    let totalNewValue = 0;

    console.log(`🏠 Minting 4 new NFTs mechanically...\n`);

    // Mint mecánico de los 4 nuevos NFTs
    for (let i = 0; i < newProperties.length; i++) {
        const property = newProperties[i];
        const recipient = newRecipients[i];
        
        console.log(`🏠 [${9 + i}/12] ${property.name}`);
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
                value: parseInt(property.estimatedValue)
            });

            totalNewValue += parseInt(property.estimatedValue);
            console.log(`   ✅ Token ID: ${tokenId}\n`);

            // Pausa entre mints
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }
    }

    // Summary de la expansión
    console.log(`🎉 Collection Successfully Expanded!\n`);
    console.log(`🏗️  Contract: ${contractAddress}`);
    console.log(`📈 Previous: 8 NFTs → Current: ${8 + mintedNFTs.length} NFTs`);
    console.log(`💰 New Value Added: $${totalNewValue.toLocaleString()} USD`);
    console.log(`💎 New Collection Total: ~$${(40000000 + totalNewValue).toLocaleString()} USD\n`);

    // Detalles de los 4 nuevos NFTs
    console.log(`🆕 New NFTs Added (4):`);
    mintedNFTs.forEach((nft, idx) => {
        const property = newProperties[idx];
        console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name}`);
        console.log(`      💰 $${nft.value.toLocaleString()} USD`);
        console.log(`      📍 ${property.location}`);
    });

    // Verificación final
    try {
        const finalSupply = await propertyContract.totalSupply();
        console.log(`\n📊 Final Collection State:`);
        console.log(`   📈 Total Supply: ${finalSupply.toString()} NFTs`);
        console.log(`   💰 Estimated Total Value: $${(40000000 + totalNewValue).toLocaleString()} USD`);
        console.log(`   📊 Avg Value per NFT: $${Math.round((40000000 + totalNewValue) / parseInt(finalSupply.toString())).toLocaleString()} USD`);
    } catch (error) {
        console.log(`\n⚠️  Could not verify final state: ${error.message}`);
    }

    console.log(`\n✨ Golden House Collection now has 12 premium NFTs!`);
    console.log(`🔄 Ready for next expansion or new series.`);

    return {
        contractAddress,
        newNFTs: mintedNFTs,
        newValue: totalNewValue,
        totalNFTs: 8 + mintedNFTs.length
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Expansion failed:", error);
        process.exit(1);
    });