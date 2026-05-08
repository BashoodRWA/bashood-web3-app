import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generador de metadatos para colección expandida (12 NFTs)
 * Añadiendo 4 nuevos NFTs a la serie unificada existente
 */

export class ExpandedGoldenCollection {
    constructor() {
        this.seriesName = "Golden House Collection - Extended";
        this.seriesDescription = "Colección expandida de 12 casas premium Bashood. Desde elegantes tonos dorados hasta diseños tech innovadores, cada NFT representa exclusividad en el metaverso.";
        this.totalSupply = 12;
        this.rarity = "LEGENDARY";
        this.baseImageUrl = "https://cdn.bashood.com/golden-house-collection/";
    }

    /**
     * Definición de los 4 nuevos NFTs (109-112)
     */
    getNewProperties() {
        return [
            {
                tokenId: 109,
                name: "Modern Tech Estate",
                description: "Casa tecnológica moderna con base plateada elegante. Ventanas verdes que simbolizan sustentabilidad y techo blanco minimalista que define el futuro de la arquitectura.",
                subset: "Modern Tech",
                rarity: "LEGENDARY",
                propertyType: 1,
                location: "Tech Valley, Bashood City",
                area: 350,
                estimatedValue: 4800000,
                features: {
                    material: "Silver Tech Base",
                    windows: "Green Sustainability Glass",
                    roof: "White Minimalist",
                    base: "Modern Silver"
                },
                amenities: ["Silver Base", "Green Tech Windows", "White Roof", "Modern Design", "Eco-Friendly", "Smart Home"],
                imageHash: "QmModernTech109"
            },
            {
                tokenId: 110,
                name: "Purple Innovation House",
                description: "Residencia innovadora con impresionantes ventanas púrpura neón. Casa negra sobre base plateada que representa la vanguardia tecnológica en el metaverso Bashood.",
                subset: "Purple Innovation",
                rarity: "LEGENDARY",
                propertyType: 1,
                location: "Innovation Hub, Bashood City",
                area: 340,
                estimatedValue: 5200000,
                features: {
                    material: "Silver Innovation Base",
                    windows: "Purple Neon Tech",
                    roof: "Metallic Innovation",
                    base: "Silver Premium"
                },
                amenities: ["Silver Base", "Purple Neon Windows", "Metal Roof", "Innovation Design", "Future Tech", "AI Integration"],
                imageHash: "QmPurpleInnovation110"
            },
            {
                tokenId: 111,
                name: "Golden Marble Mansion",
                description: "Lujosa mansión de mármol blanco con base dorada premium. Ventanas azul real que contrastan elegantemente con el diseño clásico, representando la máxima expresión del lujo.",
                subset: "Golden Marble",
                rarity: "LEGENDARY",
                propertyType: 5, // Villa
                location: "Marble Heights, Bashood City",
                area: 520,
                estimatedValue: 7500000,
                features: {
                    material: "Golden Premium Base",
                    windows: "Royal Blue Crystal",
                    roof: "Golden Marble Crown",
                    base: "Pure Gold Foundation"
                },
                amenities: ["Golden Base", "Royal Blue Windows", "Golden Roof", "Marble Walls", "Luxury Finish", "VIP Access"],
                imageHash: "QmGoldenMarble111"
            },
            {
                tokenId: 112,
                name: "Classic Tech Residence",
                description: "Residencia clásica tecnológica con perfecta combinación de tradición y modernidad. Ventanas verdes eco-friendly en un diseño atemporal que honra el pasado y abraza el futuro.",
                subset: "Classic Tech",
                rarity: "LEGENDARY",
                propertyType: 1,
                location: "Classic Tech District, Bashood City",
                area: 360,
                estimatedValue: 4600000,
                features: {
                    material: "Classic Silver Base",
                    windows: "Eco Green Smart Glass",
                    roof: "Classic Tech Tiles",
                    base: "Heritage Silver"
                },
                amenities: ["Silver Base", "Eco Green Windows", "Classic Roof", "Tech Integration", "Heritage Value", "Sustainable Tech"],
                imageHash: "QmClassicTech112"
            }
        ];
    }

    /**
     * Generar metadata para los 4 nuevos NFTs
     */
    generateNewNFTsMetadata() {
        const newProperties = this.getNewProperties();
        const outputDir = path.join(__dirname, '../metadata/unified-golden-collection');
        
        // Asegurar que existe el directorio
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const generatedNFTs = [];

        newProperties.forEach((property) => {
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

        // Actualizar índice
        this.updateCollectionIndex(generatedNFTs);

        console.log(`🆕 New NFTs metadata generated!`);
        console.log(`📁 Location: ${outputDir}`);
        console.log(`🏠 New NFTs: ${newProperties.length}`);
        console.log(`💰 New Value: $${generatedNFTs.reduce((sum, nft) => sum + nft.value, 0).toLocaleString()} USD\n`);
        
        generatedNFTs.forEach((nft, idx) => {
            console.log(`   ${idx + 1}. Token #${nft.tokenId}: ${nft.name} (${nft.subset})`);
        });

        return generatedNFTs;
    }

    /**
     * Generar metadata individual para NFT
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
                // Amenities como traits
                ...amenities.map(amenity => ({
                    trait_type: amenity.replace(/\s+/g, ' '),
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
     * Actualizar índice de colección
     */
    updateCollectionIndex(newNFTs) {
        const outputDir = path.join(__dirname, '../metadata/unified-golden-collection');
        const indexPath = path.join(outputDir, 'index.json');
        
        // Leer índice existente si existe
        let currentIndex = {
            collection: "Unified Golden House Collection",
            description: "Colección expandida de casas premium Bashood",
            total_items: 8,
            all_nfts: []
        };

        if (fs.existsSync(indexPath)) {
            try {
                const indexContent = fs.readFileSync(indexPath, 'utf8');
                currentIndex = JSON.parse(indexContent);
            } catch (error) {
                console.log("⚠️  Could not read existing index, creating new one");
            }
        }

        // Agregar nuevos NFTs
        currentIndex.total_items = 12;
        currentIndex.description = this.seriesDescription;
        currentIndex.all_nfts = [...(currentIndex.all_nfts || []), ...newNFTs];
        currentIndex.total_value = currentIndex.all_nfts.reduce((sum, nft) => sum + nft.value, 0);
        currentIndex.generated = new Date().toISOString();

        // Guardar índice actualizado
        fs.writeFileSync(indexPath, JSON.stringify(currentIndex, null, 2));

        console.log(`📊 Collection index updated - Total: ${currentIndex.total_items} NFTs`);
    }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    const collection = new ExpandedGoldenCollection();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'generate':
            console.log('🆕 Generating metadata for new NFTs (109-112)...');
            collection.generateNewNFTsMetadata();
            break;
            
        case 'info':
            console.log('📊 Expanded Collection Info:');
            const newProps = collection.getNewProperties();
            console.log(`New NFTs: ${newProps.length}`);
            console.log(`Total Collection: 12 NFTs`);
            const totalNewValue = newProps.reduce((sum, p) => sum + p.estimatedValue, 0);
            console.log(`New Value: $${totalNewValue.toLocaleString()} USD`);
            break;
            
        default:
            console.log(`
🆕 Expanded Golden House Collection Generator

Usage:
  node expanded-golden-collection.js generate    # Generate metadata for new NFTs
  node expanded-golden-collection.js info        # Show expansion info

Examples:
  node expanded-golden-collection.js generate
            `);
            break;
    }
}

export default ExpandedGoldenCollection;