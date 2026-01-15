import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Golden Neutral Collection - Serie #2 de Casas Premium Bashood
 * Colección de casas con tonos neutros y cobrizos elegantes
 */

export class GoldenNeutralCollection {
    constructor() {
        this.seriesName = "Golden Neutral Collection";
        this.seriesDescription = "Segunda serie de la Golden House Collection con diseños neutros y elegantes. Tonos tierra y cobrizos que evocan sofisticación y modernidad en el metaverso Bashood.";
        this.totalSupply = 4;
        this.rarity = "EPIC";
        this.seriesNumber = 2;
        this.baseImageUrl = "https://cdn.bashood.com/golden-neutral-collection/";
        this.baseValue = 3500000; // 3.5M USD base value (serie #2)
    }

    /**
     * Definición de las 4 propiedades de la Golden Neutral Collection
     */
    getCollectionProperties() {
        return [
            {
                tokenId: 201, // Starting from 201 for series #2
                name: "Neutral Classic Estate",
                description: "Elegante residencia con base cobriza y ventanas verdes naturales. Techo de tejas blancas que contrasta perfectamente con el diseño neutro. Un oasis de tranquilidad y sofisticación.",
                series: "Golden Neutral Collection #201",
                rarity: "EPIC",
                propertyType: 1, // House
                location: "Serenity Gardens, Bashood City",
                area: 320,
                estimatedValue: this.baseValue * 1.0, // 3.5M USD
                features: {
                    roofMaterial: "Classic White Tiles",
                    baseMaterial: "Copper Bronze",
                    windowStyle: "Natural Green Frame",
                    lighting: "Soft Natural Glow",
                    exclusivity: "Neutral Series #201"
                },
                amenities: [
                    "Copper Bronze Base",
                    "White Tile Roof",
                    "Natural Lighting",
                    "Green Window Accent",
                    "Peaceful Environment",
                    "Metaverse Harmony",
                    "Eco-Friendly Design",
                    "Neutral Elegance"
                ],
                attributes: {
                    "Collection Series": "#201",
                    "Roof Type": "Classic White Tiles",
                    "Base Material": "Copper Bronze",
                    "Window Color": "Natural Green",
                    "Door Style": "Neutral Arch",
                    "Lighting": "Soft Natural",
                    "Chimney": "Copper Crown",
                    "Design Style": "Neutral Elegance",
                    "Color Palette": "Earth Tones",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmNeutralClassic201",
                animationHash: "QmNeutralClassic201_360",
                metadataURI: "golden-neutral-collection/201.json"
            },
            {
                tokenId: 202,
                name: "Copper Elite Manor",
                description: "Mansión de élite con base plateada y espectacular techo cobrizo. Ventanas con iluminación naranja cálida que crea una atmósfera acogedora y lujosa.",
                series: "Golden Neutral Collection #202",
                rarity: "EPIC",
                propertyType: 5, // Villa
                location: "Copper Heights, Bashood City",
                area: 420,
                estimatedValue: this.baseValue * 1.3, // 4.55M USD
                features: {
                    roofMaterial: "Premium Copper",
                    baseMaterial: "Platinum Silver",
                    windowStyle: "Warm Orange Glow",
                    lighting: "Elite Copper Aura",
                    exclusivity: "Elite Series #202"
                },
                amenities: [
                    "Platinum Silver Base",
                    "Premium Copper Roof",
                    "Elite Lighting",
                    "Warm Orange Windows",
                    "Luxury Access",
                    "Metaverse Elite",
                    "Premium Materials",
                    "Copper Elegance"
                ],
                attributes: {
                    "Collection Series": "#202",
                    "Roof Type": "Premium Copper",
                    "Base Material": "Platinum Silver",
                    "Window Color": "Warm Orange",
                    "Door Style": "Elite Arch",
                    "Lighting": "Elite Copper Aura",
                    "Chimney": "Copper Elite",
                    "Design Style": "Copper Luxury",
                    "Color Palette": "Copper & Silver",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmCopperElite202",
                animationHash: "QmCopperElite202_360",
                metadataURI: "golden-neutral-collection/202.json"
            },
            {
                tokenId: 203,
                name: "Copper Tech Residence",
                description: "Residencia tecnológica con impresionantes ventanas azul neón que simbolizan innovación. Base cobriza que fusiona tradición con futurismo en un diseño único.",
                series: "Golden Neutral Collection #203",
                rarity: "EPIC",
                propertyType: 1, // House
                location: "Innovation District, Bashood City",
                area: 380,
                estimatedValue: this.baseValue * 1.4, // 4.9M USD (más raro por tech)
                features: {
                    roofMaterial: "Copper Tech",
                    baseMaterial: "Copper Bronze Premium",
                    windowStyle: "Tech Blue Neon",
                    lighting: "Futuristic Blue Aura",
                    exclusivity: "Tech Innovation Series #203"
                },
                amenities: [
                    "Copper Bronze Base",
                    "Tech Copper Roof",
                    "Neon Blue Windows",
                    "Smart Home Integration",
                    "Innovation Access",
                    "Metaverse Tech",
                    "Future-Ready Design",
                    "Digital Integration"
                ],
                attributes: {
                    "Collection Series": "#203",
                    "Roof Type": "Copper Tech",
                    "Base Material": "Copper Bronze Premium",
                    "Window Color": "Tech Blue Neon",
                    "Door Style": "Tech Portal",
                    "Lighting": "Futuristic Blue",
                    "Chimney": "Tech Copper",
                    "Design Style": "Copper Tech Fusion",
                    "Color Palette": "Copper & Neon Blue",
                    "Tech Level": "Advanced",
                    "Smart Features": "Integrated",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmCopperTech203",
                animationHash: "QmCopperTech203_360",
                metadataURI: "golden-neutral-collection/203.json"
            },
            {
                tokenId: 204,
                name: "Copper Heritage Mansion",
                description: "Mansión patrimonial con acabados cobrizos y techo oscuro elegante. Ventanas doradas clásicas que mantienen la tradición mientras abrazan la modernidad.",
                series: "Golden Neutral Collection #204",
                rarity: "EPIC",
                propertyType: 5, // Villa
                location: "Heritage Hills, Bashood City",
                area: 390,
                estimatedValue: this.baseValue * 1.2, // 4.2M USD
                features: {
                    roofMaterial: "Dark Heritage Shingles",
                    baseMaterial: "Copper Heritage",
                    windowStyle: "Classic Golden Frame",
                    lighting: "Heritage Golden Warmth",
                    exclusivity: "Heritage Series #204"
                },
                amenities: [
                    "Copper Heritage Base",
                    "Dark Premium Roof",
                    "Golden Classic Windows",
                    "Heritage Lighting",
                    "Traditional Access",
                    "Metaverse Heritage",
                    "Classic Elegance",
                    "Timeless Design"
                ],
                attributes: {
                    "Collection Series": "#204",
                    "Roof Type": "Dark Heritage",
                    "Base Material": "Copper Heritage",
                    "Window Color": "Classic Golden",
                    "Door Style": "Heritage Portal",
                    "Lighting": "Heritage Warmth",
                    "Chimney": "Heritage Copper",
                    "Design Style": "Heritage Elegance",
                    "Color Palette": "Copper & Dark Tones",
                    "Heritage Value": "High",
                    "Historical Significance": "Premium",
                    "Year Designed": 2025,
                    "Designer": "Bashood Studios"
                },
                imageHash: "QmCopperHeritage204",
                animationHash: "QmCopperHeritage204_360",
                metadataURI: "golden-neutral-collection/204.json"
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
            external_link: "https://bashood.com/golden-neutral-collection",
            
            seller_fee_basis_points: 400, // 4% royalty for series #2
            fee_recipient: "0x742d35Cc6634C0532925a3b8D4D1C8B1B5c45C00",
            
            properties: {
                category: "Premium Real Estate",
                blockchain: "Ethereum",
                total_supply: this.totalSupply,
                series: "Golden Neutral Collection - Series #2",
                rarity: "EPIC",
                collection_type: "Limited Edition Series",
                launch_date: "2025-11-20",
                series_number: this.seriesNumber,
                parent_collection: "Golden House Collection",
                utility_features: [
                    "Metaverse Premium Access",
                    "Neutral Staking Rewards",
                    "Exclusive Community Access",
                    "Tech Integration Benefits",
                    "Heritage Collection Value",
                    "Cross-Series Benefits"
                ]
            },

            collection_features: {
                "3D_Design": "Professional Studio Quality",
                "Animation_Support": "360° Interactive Views",
                "Rarity_Level": "Epic Premium",
                "Investment_Potential": "High Growth Series",
                "Utility_Access": "Full Metaverse Integration",
                "Community_Benefits": "Neutral Circle Access",
                "Cross_Series_Benefits": "Golden Collection Synergy"
            },

            design_features: {
                "Color_Palette": "Neutral & Copper Tones",
                "Lighting_Effects": "Varied Window Illumination",
                "Material_Quality": "Premium Copper & Bronze",
                "Architectural_Style": "Modern Neutral Elegance",
                "Innovation_Level": "Tech-Enhanced Heritage"
            },

            socials: {
                website: "https://bashood.com/golden-neutral-collection",
                twitter: "https://twitter.com/BashoodNeutral",
                discord: "https://discord.gg/bashood-neutral",
                telegram: "https://t.me/bashood_neutral"
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
            external_url: `https://bashood.com/nft/golden-neutral-collection/${tokenId}`,
            image: `${this.baseImageUrl}${imageHash}.png`,
            animation_url: `${this.baseImageUrl}${animationHash}.mp4`,
            
            attributes: [
                {
                    trait_type: "Collection",
                    value: "Golden Neutral Collection"
                },
                {
                    trait_type: "Series",
                    value: series
                },
                {
                    trait_type: "Series Number",
                    value: this.seriesNumber,
                    display_type: "number"
                },
                {
                    trait_type: "Parent Collection",
                    value: "Golden House Collection"
                },
                {
                    trait_type: "Rarity",
                    value: rarity
                },
                {
                    trait_type: "Property Type",
                    value: propertyType === 5 ? "Villa" : "House"
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
                collection: "Golden Neutral Collection",
                series: series,
                series_number: this.seriesNumber,
                parent_collection: "Golden House Collection",
                rarity: rarity,
                propertyType: propertyType === 5 ? "Villa" : "House",
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
            "Copper Base", "Premium Roof", "Smart Integration", "Heritage Value",
            "Tech Features", "Natural Lighting", "Elite Access", "Neutral Design"
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
        const outputDir = path.join(__dirname, '../metadata/golden-neutral-collection');
        
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
            collection: "Golden Neutral Collection",
            description: this.seriesDescription,
            series_number: this.seriesNumber,
            parent_collection: "Golden House Collection",
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

        console.log(`🌟 Golden Neutral Collection metadata generated!`);
        console.log(`📁 Location: ${outputDir}`);
        console.log(`🏠 Total NFTs: ${this.totalSupply}`);
        console.log(`📊 Series Number: #${this.seriesNumber}`);
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
            customTokenURI: `https://api.bashood.com/nft/golden-neutral-collection/${property.metadataURI}`
        }));
    }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    const collection = new GoldenNeutralCollection();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'generate':
            console.log('🌟 Generating Golden Neutral Collection metadata...');
            collection.saveAllMetadata();
            break;
            
        case 'contract':
            console.log('🔨 Generating contract minting data...');
            const mintingData = collection.getContractMintingData();
            console.log(JSON.stringify(mintingData, null, 2));
            break;
            
        case 'info':
            console.log('📊 Golden Neutral Collection Info:');
            const info = collection.generateCollectionMetadata();
            console.log(`Name: ${info.name}`);
            console.log(`Series: #${collection.seriesNumber}`);
            console.log(`Total Supply: ${info.properties.total_supply}`);
            console.log(`Rarity: ${info.properties.rarity}`);
            console.log(`Royalty: ${info.seller_fee_basis_points / 100}%`);
            break;
            
        default:
            console.log(`
🌟 Golden Neutral Collection Generator

Usage:
  node golden-neutral-collection.js generate    # Generate all metadata
  node golden-neutral-collection.js contract    # Show contract minting data
  node golden-neutral-collection.js info        # Show collection info

Examples:
  node golden-neutral-collection.js generate
  node golden-neutral-collection.js contract
            `);
            break;
    }
}

export default GoldenNeutralCollection;