import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script de Verificación y Preparación para IPFS
 * P0: Verificar metadata, generar checksums, preparar para upload a IPFS
 */

class MetadataVerifier {
    constructor() {
        this.metadataDir = path.join(__dirname, '../metadata/unified-golden-collection');
        this.outputDir = path.join(__dirname, '../ipfs-ready');
        this.errors = [];
        this.warnings = [];
        this.verifiedTokens = [];
    }

    /**
     * Verificar estructura ERC-721 estándar
     */
    validateERC721Metadata(metadata, tokenId) {
        const required = ['name', 'description', 'image'];
        const errors = [];

        required.forEach(field => {
            if (!metadata[field]) {
                errors.push(`Token ${tokenId}: Missing required field '${field}'`);
            }
        });

        // Verificar tipos
        if (metadata.attributes && !Array.isArray(metadata.attributes)) {
            errors.push(`Token ${tokenId}: 'attributes' must be an array`);
        }

        // Verificar structure de attributes
        if (metadata.attributes) {
            metadata.attributes.forEach((attr, idx) => {
                if (!attr.trait_type || attr.value === undefined) {
                    errors.push(`Token ${tokenId}: Attribute ${idx} missing trait_type or value`);
                }
            });
        }

        return errors;
    }

    /**
     * Generar metadata preparado para IPFS
     */
    prepareForIPFS(metadata, tokenId) {
        // Crear copia limpia
        const ipfsMetadata = {
            name: metadata.name,
            description: metadata.description,
            external_url: metadata.external_url,
            
            // Placeholder para IPFS - se actualizará después del upload
            image: `ipfs://QmPLACEHOLDER_IMAGE_${tokenId}`,
            animation_url: metadata.animation_url ? `ipfs://QmPLACEHOLDER_ANIMATION_${tokenId}` : undefined,
            
            attributes: metadata.attributes || [],
            properties: {
                ...metadata.properties,
                ipfs_prepared: new Date().toISOString(),
                version: "1.0.0"
            }
        };

        // Añadir campos estándar opcionales
        if (metadata.background_color) ipfsMetadata.background_color = metadata.background_color;
        if (metadata.youtube_url) ipfsMetadata.youtube_url = metadata.youtube_url;

        return ipfsMetadata;
    }

    /**
     * Verificar todos los tokens
     */
    async verifyAllTokens() {
        console.log('🔍 Verifying Golden House Collection Metadata for IPFS...\n');

        if (!fs.existsSync(this.metadataDir)) {
            throw new Error(`Metadata directory not found: ${this.metadataDir}`);
        }

        // Leer todos los archivos JSON de tokens
        const files = fs.readdirSync(this.metadataDir)
            .filter(file => file.match(/^\d+\.json$/) && !file.startsWith('collection'))
            .sort((a, b) => {
                const aNum = parseInt(a.replace('.json', ''));
                const bNum = parseInt(b.replace('.json', ''));
                return aNum - bNum;
            });

        console.log(`📁 Found ${files.length} token metadata files\n`);

        for (const file of files) {
            const tokenId = file.replace('.json', '');
            const filePath = path.join(this.metadataDir, file);

            try {
                const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                console.log(`🏠 Verifying Token #${tokenId}: ${metadata.name}`);

                // Verificar ERC-721 compliance
                const validationErrors = this.validateERC721Metadata(metadata, tokenId);
                if (validationErrors.length > 0) {
                    this.errors.push(...validationErrors);
                    console.log(`   ❌ Validation errors: ${validationErrors.length}`);
                    validationErrors.forEach(error => console.log(`      - ${error}`));
                } else {
                    console.log(`   ✅ ERC-721 compliant`);
                }

                // Preparar para IPFS
                const ipfsMetadata = this.prepareForIPFS(metadata, tokenId);
                
                // Calcular hash del metadata
                const metadataHash = crypto.createHash('sha256')
                    .update(JSON.stringify(ipfsMetadata, null, 2))
                    .digest('hex');

                this.verifiedTokens.push({
                    tokenId: parseInt(tokenId),
                    name: metadata.name,
                    originalFile: file,
                    metadataHash,
                    estimatedValue: metadata.properties?.estimatedValue || 0,
                    propertyType: metadata.properties?.propertyType || 'House',
                    location: metadata.properties?.location || 'Unknown',
                    ipfsMetadata
                });

                console.log(`   📊 Hash: ${metadataHash.slice(0, 16)}...`);
                console.log(`   💰 Value: $${parseInt(metadata.properties?.estimatedValue || 0).toLocaleString()}`);

            } catch (error) {
                this.errors.push(`Token ${tokenId}: Failed to parse JSON - ${error.message}`);
                console.log(`   ❌ Parse error: ${error.message}`);
            }

            console.log('');
        }

        return this.generateReport();
    }

    /**
     * Generar archivos preparados para IPFS
     */
    prepareIPFSFiles() {
        console.log('📦 Preparing files for IPFS upload...\n');

        // Crear directorio de salida
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        const metadataDir = path.join(this.outputDir, 'metadata');
        const imagesDir = path.join(this.outputDir, 'images');
        
        if (!fs.existsSync(metadataDir)) fs.mkdirSync(metadataDir);
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

        // Crear archivos de metadata preparados
        this.verifiedTokens.forEach(token => {
            const filename = `${token.tokenId.toString().padStart(3, '0')}.json`;
            const filePath = path.join(metadataDir, filename);
            
            fs.writeFileSync(
                filePath,
                JSON.stringify(token.ipfsMetadata, null, 2)
            );
            
            console.log(`📄 Created: metadata/${filename}`);
        });

        // Crear archivo de collection
        const collectionMetadata = this.generateCollectionMetadata();
        fs.writeFileSync(
            path.join(metadataDir, 'collection.json'),
            JSON.stringify(collectionMetadata, null, 2)
        );
        
        console.log(`📄 Created: metadata/collection.json`);

        // Crear instrucciones para imágenes
        this.createImageInstructions();

        console.log(`\n✅ IPFS-ready files created in: ${this.outputDir}`);
        console.log(`📁 Next: Upload ${metadataDir} and ${imagesDir} to IPFS/Pinata`);
    }

    /**
     * Generar metadata de colección
     */
    generateCollectionMetadata() {
        const totalValue = this.verifiedTokens.reduce((sum, token) => sum + token.estimatedValue, 0);

        return {
            name: "Golden House Collection",
            description: "Premium collection of 12 unique real estate NFTs in the Bashood metaverse. Each property represents luxury, innovation, and exclusive digital ownership.",
            image: "ipfs://QmPLACEHOLDER_COLLECTION_BANNER",
            banner_image: "ipfs://QmPLACEHOLDER_COLLECTION_BANNER_LARGE", 
            external_link: "https://bashood.com/golden-house-collection",
            
            seller_fee_basis_points: 500, // 5% royalty
            fee_recipient: "0x742d35Cc6634C0532925a3b8D4D1C8B1B5c45C00",
            
            total_supply: this.verifiedTokens.length,
            total_estimated_value: totalValue,
            avg_estimated_value: Math.round(totalValue / this.verifiedTokens.length),
            
            verification: {
                metadata_verified: true,
                erc721_compliant: this.errors.length === 0,
                prepared_for_ipfs: new Date().toISOString(),
                provenance_hash: this.generateProvenanceHash()
            }
        };
    }

    /**
     * Generar hash de provenance para verificación
     */
    generateProvenanceHash() {
        // Ordenar tokens por ID y concatenar hashes
        const sortedHashes = this.verifiedTokens
            .sort((a, b) => a.tokenId - b.tokenId)
            .map(token => token.metadataHash);

        const provenanceString = sortedHashes.join('');
        return crypto.createHash('sha256').update(provenanceString).digest('hex');
    }

    /**
     * Crear instrucciones para imágenes
     */
    createImageInstructions() {
        const instructions = {
            instructions: "Upload Instructions for Golden House Collection Images",
            total_images_needed: this.verifiedTokens.length * 2, // imagen + animación
            
            required_images: this.verifiedTokens.map(token => ({
                token_id: token.tokenId,
                name: token.name,
                required_files: [
                    {
                        type: "main_image",
                        filename: `${token.tokenId.toString().padStart(3, '0')}.png`,
                        description: "Main NFT image (1024x1024 recommended)"
                    },
                    {
                        type: "animation",
                        filename: `${token.tokenId.toString().padStart(3, '0')}_360.mp4`,
                        description: "360° animation (optional)",
                        required: false
                    }
                ]
            })),
            
            upload_steps: [
                "1. Create images for each token using the imageHash as reference",
                "2. Upload all images to IPFS/Pinata",
                "3. Get CID for each image",
                "4. Update metadata files with real ipfs:// URIs",
                "5. Re-upload updated metadata to IPFS",
                "6. Update contract baseURI with final metadata CID"
            ],
            
            quality_requirements: {
                image_format: "PNG or JPEG",
                min_resolution: "512x512",
                recommended_resolution: "1024x1024", 
                max_file_size: "10MB per image",
                animation_format: "MP4, GIF, or WebM",
                animation_max_size: "50MB"
            }
        };

        fs.writeFileSync(
            path.join(this.outputDir, 'image-upload-instructions.json'),
            JSON.stringify(instructions, null, 2)
        );
        
        console.log(`📋 Created: image-upload-instructions.json`);
    }

    /**
     * Generar reporte final
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            total_tokens: this.verifiedTokens.length,
            total_errors: this.errors.length,
            total_warnings: this.warnings.length,
            
            collection_stats: {
                total_value: this.verifiedTokens.reduce((sum, t) => sum + t.estimatedValue, 0),
                avg_value: Math.round(this.verifiedTokens.reduce((sum, t) => sum + t.estimatedValue, 0) / this.verifiedTokens.length),
                property_types: this.getPropertyTypeStats(),
                value_range: this.getValueRange()
            },
            
            verification_results: {
                erc721_compliant: this.errors.length === 0,
                ready_for_ipfs: this.errors.length === 0,
                provenance_hash: this.generateProvenanceHash()
            },
            
            tokens: this.verifiedTokens.map(token => ({
                tokenId: token.tokenId,
                name: token.name,
                metadataHash: token.metadataHash,
                estimatedValue: token.estimatedValue
            })),
            
            errors: this.errors,
            warnings: this.warnings
        };

        // Guardar reporte
        fs.writeFileSync(
            path.join(this.outputDir, 'verification-report.json'),
            JSON.stringify(report, null, 2)
        );

        return report;
    }

    /**
     * Estadísticas de tipos de propiedades
     */
    getPropertyTypeStats() {
        const stats = {};
        this.verifiedTokens.forEach(token => {
            const type = token.propertyType;
            stats[type] = (stats[type] || 0) + 1;
        });
        return stats;
    }

    /**
     * Rango de valores
     */
    getValueRange() {
        const values = this.verifiedTokens.map(t => t.estimatedValue);
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
        };
    }

    /**
     * Mostrar resumen en consola
     */
    displaySummary(report) {
        console.log('\n📊 VERIFICATION SUMMARY\n');
        console.log(`🏠 Total Tokens: ${report.total_tokens}`);
        console.log(`💰 Total Value: $${report.collection_stats.total_value.toLocaleString()}`);
        console.log(`📊 Avg Value: $${report.collection_stats.avg_value.toLocaleString()}`);
        console.log(`🔒 Provenance Hash: ${report.verification_results.provenance_hash.slice(0, 16)}...`);
        
        if (report.total_errors === 0) {
            console.log('✅ All tokens are ERC-721 compliant and ready for IPFS!');
        } else {
            console.log(`❌ ${report.total_errors} errors found. Fix before proceeding.`);
        }

        if (report.total_warnings > 0) {
            console.log(`⚠️  ${report.total_warnings} warnings to review.`);
        }

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Review verification-report.json for any errors');
        console.log('2. Create images for each token (see image-upload-instructions.json)');
        console.log('3. Upload images and metadata to IPFS/Pinata');
        console.log('4. Update contract with final IPFS URIs');
        console.log('5. Deploy to testnet for verification\n');
    }
}

// Ejecutar verificación
async function main() {
    const verifier = new MetadataVerifier();
    
    try {
        const report = await verifier.verifyAllTokens();
        verifier.prepareIPFSFiles();
        verifier.displaySummary(report);
        
        console.log(`📁 All files ready in: ${verifier.outputDir}`);
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    main();
}

export default MetadataVerifier;