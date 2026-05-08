import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Golden House Collection - Serie Premium de NFTs Bashood
 * Colección limitada de casas doradas con diseños únicos
 */

export class GoldenHouseCollection {
    constructor() {
        this.seriesName = "Golden House Collection";
        this.seriesDescription = "Colección limitada de casas premium con acabados dorados y diseños únicos. Cada NFT representa una propiedad de lujo en el metaverso Bashood.";
        this.totalSupply = 4;
        this.rarity = "LEGENDARY";
        this.baseImageUrl = "https://cdn.bashood.com/golden-collection/";
        this.baseValue = 5000000; // 5M USD base value
    }

    /**
     * Definición de las 4 propiedades de la Golden House Collection
     */
    getCollectionProperties() {
        return [
            {
                tokenId: 101, // Starting from 101 for premium series
                name: "Golden Classic Manor",
                description: "Elegante mansión con acabados dorados clásicos sobre base de platino. Diseño atemporal que combina lujo y sofisticación. Ventanas illuminadas que crean un ambiente cálido y acogedor.",
                series: "Golden House Collection #001",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Golden District, Bashood City",
                area: 450,
                estimatedValue: this.baseValue * 1.0, // 5M USD
                features: {
                    roofMaterial: "Golden Premium Tiles",
                    baseMaterial: "Platinum Silver",
                    windowStyle: "Classic Golden Frame",
                    lighting: "Warm Golden Glow",
                    exclusivity: "Limited Series #001"
                },
                amenities: [
                    "Golden Roof Tiles",
                    "Platinum Base",
                    "Premium Lighting",
                    "Classic Windows",
                    "VIP Access",
                    "Metaverse Ready",
                    "Collectible Series"
                ],
                attributes: {
                    "Collection Series": "#001",
                    "Roof Type": "Golden Classic",
                    "Base Material": "Platinum Silver", 
                    "Window Count": 2,
                    "Door Style": "Arched Golden",
                    "Lighting": "Warm Ambient",
                    "Chimney": "Golden Cap",
                    "Exclusivity Level": "Ultra Rare",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmGoldenClassic001",
                animationHash: "QmGoldenClassic001_360",
                metadataURI: "golden-collection/001.json"
            },
            {
                tokenId: 102,
                name: "Golden Prestige Estate",
                description: "Exclusiva residencia con base completamente dorada y diseño premium. Arquitectura moderna con toques clásicos que refleja el estatus más alto en la comunidad Bashood.",
                series: "Golden House Collection #002", 
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Prestige Avenue, Bashood City",
                area: 475,
                estimatedValue: this.baseValue * 1.2, // 6M USD
                features: {
                    roofMaterial: "Golden Premium Tiles",
                    baseMaterial: "Pure Gold",
                    windowStyle: "Prestige Golden Frame",
                    lighting: "Premium Golden Aura",
                    exclusivity: "Limited Series #002"
                },
                amenities: [
                    "Full Golden Base",
                    "Premium Roof",
                    "Prestige Lighting",
                    "Gold Frame Windows",
                    "Elite Access",
                    "Metaverse VIP",
                    "Collectible Series",
                    "Investment Grade"
                ],
                attributes: {
                    "Collection Series": "#002",
                    "Roof Type": "Golden Premium",
                    "Base Material": "Pure Gold",
                    "Window Count": 2,
                    "Door Style": "Prestige Arch",
                    "Lighting": "Golden Aura",
                    "Chimney": "Premium Gold",
                    "Exclusivity Level": "Ultra Premium",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmGoldenPrestige002",
                animationHash: "QmGoldenPrestige002_360", 
                metadataURI: "golden-collection/002.json"
            },
            {
                tokenId: 103,
                name: "Golden Heritage Villa",
                description: "Villa de herencia con características clásicas refinadas. Combina tradición y lujo con una base de platino que resalta la elegancia dorada de la estructura principal.",
                series: "Golden House Collection #003",
                rarity: "LEGENDARY", 
                propertyType: 5, // Villa
                location: "Heritage Lane, Bashood City",
                area: 425,
                estimatedValue: this.baseValue * 1.1, // 5.5M USD
                features: {
                    roofMaterial: "Heritage Golden Tiles",
                    baseMaterial: "Classic Platinum",
                    windowStyle: "Heritage Golden Frame", 
                    lighting: "Classic Golden Warmth",
                    exclusivity: "Limited Series #003"
                },
                amenities: [
                    "Heritage Design",
                    "Classic Platinum Base",
                    "Golden Warmth",
                    "Traditional Windows",
                    "Heritage Access",
                    "Metaverse Classic",
                    "Collectible Series",
                    "Historical Value"
                ],
                attributes: {
                    "Collection Series": "#003",
                    "Roof Type": "Heritage Golden",
                    "Base Material": "Classic Platinum",
                    "Window Count": 2,
                    "Door Style": "Heritage Arch",
                    "Lighting": "Classic Warm",
                    "Chimney": "Traditional Gold",
                    "Exclusivity Level": "Heritage Rare",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmGoldenHeritage003",
                animationHash: "QmGoldenHeritage003_360",
                metadataURI: "golden-collection/003.json"
            },
            {
                tokenId: 104,
                name: "Golden Rustic Retreat",
                description: "Refugio rústico único con techo de paja dorada y ventanas púrpuras místicas. Diseño eco-luxury que combina materiales naturales con toques dorados exclusivos de la colección.",
                series: "Golden House Collection #004",
                rarity: "LEGENDARY",
                propertyType: 6, // Townhouse (más rústico)
                location: "Mystic Woods, Bashood City", 
                area: 380,
                estimatedValue: this.baseValue * 1.3, // 6.5M USD (más raro por ser único)
                features: {
                    roofMaterial: "Golden Thatched Straw",
                    baseMaterial: "Pure Gold Luxe",
                    windowStyle: "Mystic Purple Glow",
                    lighting: "Purple Mystical Aura",
                    exclusivity: "Ultra Rare Series #004"
                },
                amenities: [
                    "Thatched Golden Roof",
                    "Pure Gold Base",
                    "Mystic Purple Windows",
                    "Natural Wood Walls",
                    "Eco-Luxury Design",
                    "Mystical Access",
                    "Collectible Unique",
                    "Environmental Harmony"
                ],
                attributes: {
                    "Collection Series": "#004",
                    "Roof Type": "Golden Thatch",
                    "Base Material": "Pure Gold Luxe",
                    "Window Count": 2,
                    "Window Color": "Mystic Purple",
                    "Door Style": "Rustic Golden",
                    "Wall Material": "Natural Wood",
                    "Lighting": "Purple Mystical",
                    "Chimney": "Golden Rustic",
                    "Exclusivity Level": "Ultra Unique",
                    "Eco Rating": "Premium Green",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmGoldenRustic004",
                animationHash: "QmGoldenRustic004_360",
                metadataURI: "golden-collection/004.json"
            }
        ];
    }

    /**
     * Generar metadatos completos para la colección
     */
    generateCollectionMetadata() {
        return {
            name: this.seriesName,
            description: this.seriesDescription,
            image: `${this.baseImageUrl}collection-banner.png`,
            banner_image: `${this.baseImageUrl}collection-banner-large.png`,
            external_link: "https://bashood.com/golden-collection",
            
            seller_fee_basis_points: 500, // 5% royalty for premium collection
            fee_recipient: "0x742d35Cc6634C0532925a3b8D4D1C8B1B5c45C00",
            
            properties: {
                category: "Premium Real Estate",
                blockchain: "Ethereum",
                total_supply: this.totalSupply,
                series: "Golden House Collection",
                rarity: "LEGENDARY",
                collection_type: "Limited Edition",
                launch_date: "2025-11-20",
                utility_features: [
                    "Metaverse Premium Access",
                    "VIP Governance Rights",
                    "Golden Staking Rewards",
                    "Exclusive Community Access",
                    "Investment Grade Asset",
                    "Heritage Collection Value"
                ]
            },

            collection_features: {
                "3D_Design": "Professional Studio Quality",
                "Animation_Support": "360° Interactive Views", 
                "Rarity_Level": "Ultra Legendary",
                "Investment_Potential": "High Premium Growth",
                "Utility_Access": "Full Metaverse Integration",
                "Community_Benefits": "VIP Golden Circle Access"
            },

            socials: {
                website: "https://bashood.com/golden-collection",
                twitter: "https://twitter.com/BashoodGolden", 
                discord: "https://discord.gg/bashood-golden",
                telegram: "https://t.me/bashood_golden"
            }
        };
    }

    /**
     * Generar metadata individual para cada NFT
     */
    generateNFTMetadata(propertyData) {
        const {
            tokenId, name, description, series, rarity, propertyType,
            location, area, estimatedValue, features, amenities, attributes,
            imageHash, animationHash, metadataURI
        } = propertyData;

        return {
            name: name,
            description: description,
            external_url: `https://bashood.com/nft/golden-collection/${tokenId}`,
            image: `${this.baseImageUrl}${imageHash}.png`,
            animation_url: `${this.baseImageUrl}${animationHash}.mp4`,
            
            attributes: [
                {
                    trait_type: "Collection",
                    value: "Golden House Collection"
                },
                {
                    trait_type: "Series",
                    value: series
                },
                {
                    trait_type: "Rarity",
                    value: rarity
                },
                {
                    trait_type: "Property Type", 
                    value: propertyType === 5 ? "Villa" : "Townhouse"
                },
                {
                    trait_type: "Location",
                    value: location
                },
                {
                    trait_type: "Area",
                    value: area,
                    display_type: "number",
                    trait_suffix: " sqm"
                },
                {
                    trait_type: "Estimated Value",
                    value: estimatedValue,
                    display_type: "number", 
                    trait_suffix: " USD"
                },
                // Attributes específicos de cada propiedad
                ...Object.entries(attributes).map(([key, value]) => ({
                    trait_type: key,
                    value: value
                })),
                // Amenities como traits booleanos
                ...this.generateAmenitiesTraits(amenities)
            ],

            properties: {
                category: "Premium Real Estate",
                collection: "Golden House Collection",
                series: series,
                rarity: rarity,
                propertyType: propertyType === 5 ? "Villa" : "Townhouse", 
                location: location,
                area: area,
                estimatedValue: estimatedValue,
                features: features,
                amenities: amenities,
                generated: new Date().toISOString()
            }
        };
    }

    /**
     * Generar traits para amenities
     */
    generateAmenitiesTraits(amenities) {
        const standardAmenities = [
            "Golden Roof", "Premium Base", "VIP Access", "Metaverse Ready",
            "Collectible Series", "Investment Grade", "Luxury Lighting",
            "Premium Windows", "Exclusive Design", "Heritage Value"
        ];

        return standardAmenities.map(amenity => ({
            trait_type: amenity,
            value: amenities.some(a => a.includes(amenity.split(' ')[0])) ? "Yes" : "No"
        }));
    }

    /**
     * Guardar todos los metadatos
     */
    saveAllMetadata() {
        const outputDir = path.join(__dirname, '../metadata/golden-collection');
        
        // Crear directorio si no existe
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generar metadata de colección
        const collectionMetadata = this.generateCollectionMetadata();
        fs.writeFileSync(
            path.join(outputDir, 'collection.json'),
            JSON.stringify(collectionMetadata, null, 2)
        );

        // Generar metadata individual
        const properties = this.getCollectionProperties();
        const generatedNFTs = [];

        properties.forEach((property) => {
            const nftMetadata = this.generateNFTMetadata(property);
            const filename = `${property.tokenId.toString().padStart(3, '0')}.json`;
            
            fs.writeFileSync(
                path.join(outputDir, filename), 
                JSON.stringify(nftMetadata, null, 2)
            );

            generatedNFTs.push({
                tokenId: property.tokenId,
                name: property.name,
                filename: filename,
                value: property.estimatedValue
            });
        });

        // Generar índice
        const index = {
            collection: "Golden House Collection", 
            description: this.seriesDescription,
            total_items: this.totalSupply,
            collection_metadata: "collection.json",
            nft_files: generatedNFTs,
            generated: new Date().toISOString(),
            total_value: generatedNFTs.reduce((sum, nft) => sum + nft.value, 0)
        };

        fs.writeFileSync(
            path.join(outputDir, 'index.json'),
            JSON.stringify(index, null, 2)
        );

        console.log(`✨ Golden House Collection metadata generated!`);
        console.log(`📁 Location: ${outputDir}`);
        console.log(`🏠 Total NFTs: ${this.totalSupply}`);
        console.log(`💰 Total Collection Value: $${index.total_value.toLocaleString()} USD`);
        
        generatedNFTs.forEach((nft, idx) => {
            console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name}`);
        });

        return {
            outputDir,
            collection: collectionMetadata,
            nfts: generatedNFTs,
            totalValue: index.total_value
        };
    }

    /**
     * Generar datos para el contrato (formato para minteo)
     */
    getContractMintingData() {
        const properties = this.getCollectionProperties();
        
        return properties.map(property => ({
            to: "0x0000000000000000000000000000000000000000", // Se definirá al momento del mint
            propertyData: {
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
                originalOwner: "0x0000000000000000000000000000000000000000"
            },
            customTokenURI: `https://api.bashood.com/nft/golden-collection/${property.metadataURI}`
        }));
    }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    const collection = new GoldenHouseCollection();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'generate':
            console.log('✨ Generating Golden House Collection metadata...');
            collection.saveAllMetadata();
            break;
            
        case 'contract':
            console.log('🔨 Generating contract minting data...');
            const mintingData = collection.getContractMintingData();
            console.log(JSON.stringify(mintingData, null, 2));
            break;
            
        case 'info':
            console.log('📊 Golden House Collection Info:');
            const info = collection.generateCollectionMetadata();
            console.log(`Name: ${info.name}`);
            console.log(`Total Supply: ${info.properties.total_supply}`);
            console.log(`Rarity: ${info.properties.rarity}`);
            console.log(`Royalty: ${info.seller_fee_basis_points / 100}%`);
            break;
            
        default:
            console.log(`
✨ Golden House Collection Generator

Usage:
  node golden-house-collection.js generate    # Generate all metadata
  node golden-house-collection.js contract    # Show contract minting data  
  node golden-house-collection.js info        # Show collection info

Examples:
  node golden-house-collection.js generate
  node golden-house-collection.js contract
            `);
            break;
    }
}

export default GoldenHouseCollection;