import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Unified Golden House Collection - 8 NFTs en una sola serie
 * 4 NFTs dorados + 4 NFTs neutros = 1 colección completa
 */

export class UnifiedGoldenCollection {
    constructor() {
        this.seriesName = "Golden House Collection";
        this.seriesDescription = "Colección unificada de 8 casas premium Bashood. Desde elegantes tonos dorados hasta sofisticados neutros cobrizos, cada NFT representa una propiedad única en el metaverso.";
        this.totalSupply = 8;
        this.rarity = "LEGENDARY";
        this.baseImageUrl = "https://cdn.bashood.com/golden-house-collection/";
        this.baseValue = 5000000; // 5M USD base value
    }

    /**
     * Definición completa de las 8 propiedades (4 doradas + 4 neutras)
     */
    getCollectionProperties() {
        return [
            // SUBSET 1: Golden Houses (1-4)
            {
                tokenId: 101,
                name: "Golden Classic Manor",
                description: "Majestuosa mansión dorada con elegantes detalles en oro puro. Ventanas de cristal verde esmeralda que reflejan la luz del metaverso.",
                subset: "Golden Classic",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Golden District, Bashood City",
                area: 450,
                estimatedValue: this.baseValue * 1.0, // 5M USD
                features: {
                    material: "Pure Gold Finish",
                    windows: "Emerald Crystal",
                    roof: "Golden Crown Tiles",
                    base: "Golden Marble"
                },
                amenities: ["Golden Finish", "Crystal Windows", "Crown Roof", "Marble Base"],
                imageHash: "QmGoldenClassic101"
            },
            {
                tokenId: 102,
                name: "Golden Prestige Estate",
                description: "Estate de prestigio con acabados dorados premium y ventanas azul real. Símbolo de estatus en el metaverso Bashood.",
                subset: "Golden Prestige",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Prestige Heights, Bashood City",
                area: 500,
                estimatedValue: this.baseValue * 1.2, // 6M USD
                features: {
                    material: "Premium Gold Alloy",
                    windows: "Royal Blue Crystal",
                    roof: "Prestige Golden Tiles",
                    base: "Golden Premium"
                },
                amenities: ["Premium Gold", "Royal Windows", "Prestige Roof", "Elite Base"],
                imageHash: "QmGoldenPrestige102"
            },
            {
                tokenId: 103,
                name: "Golden Heritage Villa",
                description: "Villa patrimonial con rica herencia dorada. Ventanas color ámbar que evocan tradición y lujo atemporal.",
                subset: "Golden Heritage",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Heritage Golden Hills, Bashood City",
                area: 480,
                estimatedValue: this.baseValue * 1.3, // 6.5M USD
                features: {
                    material: "Heritage Gold",
                    windows: "Amber Heritage Crystal",
                    roof: "Traditional Golden Shingles",
                    base: "Heritage Foundation"
                },
                amenities: ["Heritage Gold", "Amber Windows", "Traditional Roof", "Heritage Base"],
                imageHash: "QmGoldenHeritage103"
            },
            {
                tokenId: 104,
                name: "Golden Rustic Retreat",
                description: "Refugio rústico dorado que combina elegancia con naturaleza. Ventanas naranjas cálidas que crean una atmósfera acogedora.",
                subset: "Golden Rustic",
                rarity: "LEGENDARY", 
                propertyType: 1, // House
                location: "Golden Nature Reserve, Bashood City",
                area: 380,
                estimatedValue: this.baseValue * 1.1, // 5.5M USD
                features: {
                    material: "Rustic Gold Blend",
                    windows: "Warm Orange Glow",
                    roof: "Rustic Golden Tiles",
                    base: "Natural Golden Stone"
                },
                amenities: ["Rustic Gold", "Warm Windows", "Natural Roof", "Stone Base"],
                imageHash: "QmGoldenRustic104"
            },
            
            // SUBSET 2: Neutral Houses (5-8)
            {
                tokenId: 105,
                name: "Neutral Classic Estate",
                description: "Elegante residencia con base cobriza y ventanas verdes naturales. Techo de tejas blancas que contrasta perfectamente con el diseño neutro.",
                subset: "Neutral Classic",
                rarity: "LEGENDARY",
                propertyType: 1, // House
                location: "Serenity Gardens, Bashood City",
                area: 320,
                estimatedValue: this.baseValue * 0.7, // 3.5M USD
                features: {
                    material: "Copper Bronze",
                    windows: "Natural Green Frame",
                    roof: "Classic White Tiles",
                    base: "Copper Foundation"
                },
                amenities: ["Copper Base", "Natural Windows", "White Roof", "Bronze Finish"],
                imageHash: "QmNeutralClassic105"
            },
            {
                tokenId: 106,
                name: "Copper Elite Manor",
                description: "Mansión de élite con base plateada y espectacular techo cobrizo. Ventanas con iluminación naranja cálida que crea atmósfera lujosa.",
                subset: "Copper Elite",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Copper Heights, Bashood City",
                area: 420,
                estimatedValue: this.baseValue * 0.9, // 4.5M USD
                features: {
                    material: "Platinum Silver Base",
                    windows: "Warm Orange Glow",
                    roof: "Premium Copper",
                    base: "Elite Platinum"
                },
                amenities: ["Platinum Base", "Orange Windows", "Copper Roof", "Elite Finish"],
                imageHash: "QmCopperElite106"
            },
            {
                tokenId: 107,
                name: "Copper Tech Residence",
                description: "Residencia tecnológica con impresionantes ventanas azul neón. Base cobriza que fusiona tradición con futurismo innovador.",
                subset: "Copper Tech",
                rarity: "LEGENDARY",
                propertyType: 1, // House
                location: "Innovation District, Bashood City",
                area: 380,
                estimatedValue: this.baseValue * 1.0, // 5M USD (tech premium)
                features: {
                    material: "Copper Tech Alloy",
                    windows: "Tech Blue Neon",
                    roof: "Smart Copper Tiles",
                    base: "Tech Foundation"
                },
                amenities: ["Tech Copper", "Neon Windows", "Smart Roof", "Innovation Base"],
                imageHash: "QmCopperTech107"
            },
            {
                tokenId: 108,
                name: "Copper Heritage Mansion",
                description: "Mansión patrimonial con acabados cobrizos y techo oscuro elegante. Ventanas doradas clásicas que mantienen la tradición.",
                subset: "Copper Heritage",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Heritage Hills, Bashood City", 
                area: 390,
                estimatedValue: this.baseValue * 0.8, // 4M USD
                features: {
                    material: "Copper Heritage",
                    windows: "Classic Golden Frame",
                    roof: "Dark Heritage Shingles",
                    base: "Heritage Copper"
                },
                amenities: ["Heritage Copper", "Golden Windows", "Dark Roof", "Classic Base"],
                imageHash: "QmCopperHeritage108"
            }
        ];
    }

    /**
     * Generar metadatos de colección unificada
     */
    generateCollectionMetadata() {
        return {
            name: this.seriesName,
            description: this.seriesDescription,
            image: `${this.baseImageUrl}collection-banner.png`,
            banner_image: `${this.baseImageUrl}collection-banner-large.png`,
            external_link: "https://bashood.com/golden-house-collection",
            
            seller_fee_basis_points: 500, // 5% royalty para colección unificada
            fee_recipient: "0x742d35Cc6634C0532925a3b8D4D1C8B1B5c45C00",
            
            properties: {
                category: "Premium Real Estate",
                blockchain: "Ethereum",
                total_supply: this.totalSupply,
                series: "Unified Golden House Collection",
                rarity: "LEGENDARY",
                collection_type: "Complete Premium Series",
                launch_date: "2025-11-20",
                subsets: [
                    {
                        name: "Golden Classic Subset",
                        description: "4 NFTs con acabados dorados premium",
                        token_range: "101-104",
                        avg_value: "$5.75M USD"
                    },
                    {
                        name: "Neutral Copper Subset", 
                        description: "4 NFTs con diseños neutros y cobrizos",
                        token_range: "105-108",
                        avg_value: "$4.25M USD"
                    }
                ]
            },

            collection_stats: {
                total_value: "$40M USD",
                avg_property_value: "$5M USD", 
                rarest_subset: "Golden Heritage (6.5M USD)",
                most_innovative: "Copper Tech (Smart Integration)",
                total_area: "3220 sqm",
                avg_area: "402.5 sqm"
            }
        };
    }

    /**
     * Generar metadata individual para cada NFT
     */
    generateNFTMetadata(propertyData) {
        const {
            tokenId, name, description, subset, rarity, propertyType,
            location, area, estimatedValue, features, amenities, imageHash
        } = propertyData;

        return {
            name: name,
            description: description,
            external_url: `https://bashood.com/nft/golden-house-collection/${tokenId}`,
            image: `${this.baseImageUrl}${imageHash}.png`,
            animation_url: `${this.baseImageUrl}${imageHash}_360.mp4`,
            
            attributes: [
                {
                    trait_type: "Collection",
                    value: "Golden House Collection"
                },
                {
                    trait_type: "Subset",
                    value: subset
                },
                {
                    trait_type: "Token ID",
                    value: tokenId,
                    display_type: "number"
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
                {
                    trait_type: "Material",
                    value: features.material
                },
                {
                    trait_type: "Window Style",
                    value: features.windows
                },
                {
                    trait_type: "Roof Type",
                    value: features.roof
                },
                {
                    trait_type: "Base Type",
                    value: features.base
                },
                // Amenities como traits booleanos
                ...amenities.map(amenity => ({
                    trait_type: amenity,
                    value: "Yes"
                }))
            ],

            properties: {
                category: "Premium Real Estate",
                collection: "Golden House Collection",
                subset: subset,
                tokenId: tokenId,
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
     * Guardar todos los metadatos
     */
    saveAllMetadata() {
        const outputDir = path.join(__dirname, '../metadata/unified-golden-collection');
        
        // Crear directorio
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Metadata de colección
        const collectionMetadata = this.generateCollectionMetadata();
        fs.writeFileSync(
            path.join(outputDir, 'collection.json'),
            JSON.stringify(collectionMetadata, null, 2)
        );

        // Metadata individual
        const properties = this.getCollectionProperties();
        const generatedNFTs = [];

        properties.forEach((property) => {
            const nftMetadata = this.generateNFTMetadata(property);
            const filename = `${property.tokenId.toString()}.json`;
            
            fs.writeFileSync(
                path.join(outputDir, filename),
                JSON.stringify(nftMetadata, null, 2)
            );

            generatedNFTs.push({
                tokenId: property.tokenId,
                name: property.name,
                subset: property.subset,
                filename: filename,
                value: property.estimatedValue
            });
        });

        // Índice unificado
        const index = {
            collection: "Unified Golden House Collection",
            description: this.seriesDescription,
            total_items: this.totalSupply,
            collection_metadata: "collection.json",
            subsets: {
                golden: generatedNFTs.slice(0, 4),
                neutral: generatedNFTs.slice(4, 8)
            },
            all_nfts: generatedNFTs,
            generated: new Date().toISOString(),
            total_value: generatedNFTs.reduce((sum, nft) => sum + nft.value, 0)
        };

        fs.writeFileSync(
            path.join(outputDir, 'index.json'),
            JSON.stringify(index, null, 2)
        );

        console.log(`🌟 Unified Golden House Collection metadata generated!`);
        console.log(`📁 Location: ${outputDir}`);
        console.log(`🏠 Total NFTs: ${this.totalSupply}`);
        console.log(`💰 Total Collection Value: $${index.total_value.toLocaleString()} USD`);
        console.log(`\n📊 Golden Subset (4 NFTs):`);
        generatedNFTs.slice(0, 4).forEach((nft, idx) => {
            console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name} (${nft.subset})`);
        });
        console.log(`\n📊 Neutral Subset (4 NFTs):`);
        generatedNFTs.slice(4, 8).forEach((nft, idx) => {
            console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name} (${nft.subset})`);
        });

        return {
            outputDir,
            collection: collectionMetadata,
            nfts: generatedNFTs,
            totalValue: index.total_value
        };
    }

    /**
     * Generar datos para el contrato (8 NFTs)
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
            customTokenURI: `https://api.bashood.com/nft/unified-golden-collection/${property.tokenId}.json`
        }));
    }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    const collection = new UnifiedGoldenCollection();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'generate':
            console.log('🌟 Generating Unified Golden House Collection metadata...');
            collection.saveAllMetadata();
            break;
            
        case 'contract':
            console.log('🔨 Generating contract minting data for 8 NFTs...');
            const mintingData = collection.getContractMintingData();
            console.log(JSON.stringify(mintingData.slice(0, 2), null, 2)); // Show first 2 as example
            console.log(`\n... and ${mintingData.length - 2} more NFTs`);
            break;
            
        case 'info':
            console.log('📊 Unified Golden House Collection Info:');
            const info = collection.generateCollectionMetadata();
            console.log(`Name: ${info.name}`);
            console.log(`Total Supply: ${info.properties.total_supply}`);
            console.log(`Total Value: ${info.collection_stats.total_value}`);
            console.log(`Rarity: ${info.properties.rarity}`);
            break;
            
        default:
            console.log(`
🌟 Unified Golden House Collection Generator

Usage:
  node unified-golden-collection.js generate    # Generate all metadata (8 NFTs)
  node unified-golden-collection.js contract    # Show contract minting data
  node unified-golden-collection.js info        # Show collection info

Examples:
  node unified-golden-collection.js generate
            `);
            break;
    }
}

export default UnifiedGoldenCollection;