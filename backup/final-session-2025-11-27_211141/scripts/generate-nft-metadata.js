#!/usr/bin/env node

/**
 * NFT Metadata Generator for Bashood Property NFTs
 * Generates JSON metadata compatible with OpenSea and other marketplaces
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PropertyMetadataGenerator {
    constructor() {
        this.baseUrl = "https://api.bashood.com/nft/";
        this.imageBaseUrl = "https://cdn.bashood.com/images/";
        
        this.propertyTypes = {
            1: "House",
            2: "Apartment", 
            3: "Commercial",
            4: "Land",
            5: "Villa",
            6: "Townhouse",
            7: "Penthouse"
        };

        this.rarityTiers = {
            COMMON: { min: 0, max: 100000, weight: 60 },
            UNCOMMON: { min: 100000, max: 500000, weight: 25 },
            RARE: { min: 500000, max: 1000000, weight: 10 },
            EPIC: { min: 1000000, max: 5000000, weight: 4 },
            LEGENDARY: { min: 5000000, max: Infinity, weight: 1 }
        };
    }

    /**
     * Generate metadata for a property NFT
     */
    generatePropertyMetadata(propertyData) {
        const {
            tokenId,
            name,
            description,
            location,
            propertyType,
            area,
            estimatedValue,
            amenities = [],
            imageHash,
            attributes = {}
        } = propertyData;

        const rarity = this.calculateRarity(estimatedValue);
        const propertyTypeName = this.propertyTypes[propertyType] || "Unknown";

        return {
            name: name,
            description: description,
            external_url: `${this.baseUrl}property/${tokenId}`,
            image: `${this.imageBaseUrl}${imageHash || `property-${tokenId}`}.png`,
            animation_url: `${this.imageBaseUrl}${imageHash || `property-${tokenId}`}-360.mp4`,
            
            attributes: [
                {
                    trait_type: "Property Type",
                    value: propertyTypeName
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
                    trait_type: "Rarity",
                    value: rarity
                },
                {
                    trait_type: "Amenities Count",
                    value: amenities.length,
                    display_type: "number"
                },
                ...this.generateAmenitiesAttributes(amenities),
                ...this.generateCustomAttributes(attributes)
            ],

            properties: {
                category: "Real Estate",
                propertyType: propertyTypeName,
                location: location,
                area: area,
                estimatedValue: estimatedValue,
                amenities: amenities,
                rarity: rarity,
                generated: new Date().toISOString()
            }
        };
    }

    /**
     * Calculate property rarity based on value
     */
    calculateRarity(value) {
        const valueUSD = parseFloat(value) / 1e18; // Convert from wei-scaled to USD
        
        for (const [rarity, range] of Object.entries(this.rarityTiers)) {
            if (valueUSD >= range.min && valueUSD < range.max) {
                return rarity;
            }
        }
        return "COMMON";
    }

    /**
     * Generate amenities as individual attributes
     */
    generateAmenitiesAttributes(amenities) {
        const amenityAttributes = [];
        
        // Standard amenities list for boolean attributes
        const standardAmenities = [
            "Pool", "Garden", "Garage", "Gym", "Elevator",
            "Security", "Parking", "Balcony", "Fireplace", "Air Conditioning"
        ];

        standardAmenities.forEach(amenity => {
            amenityAttributes.push({
                trait_type: `Has ${amenity}`,
                value: amenities.includes(amenity) ? "Yes" : "No"
            });
        });

        return amenityAttributes;
    }

    /**
     * Generate custom attributes
     */
    generateCustomAttributes(customAttributes) {
        return Object.entries(customAttributes).map(([key, value]) => ({
            trait_type: key,
            value: value
        }));
    }

    /**
     * Generate collection-level metadata
     */
    generateCollectionMetadata() {
        return {
            name: "Bashood Property Collection",
            description: "Premium real estate NFTs representing tokenized properties in the Bashood ecosystem. Each NFT represents ownership or shares in real-world properties, complete with detailed metadata, valuations, and utility features.",
            
            image: `${this.imageBaseUrl}collection-banner.png`,
            banner_image: `${this.imageBaseUrl}collection-banner-large.png`,
            featured_image: `${this.imageBaseUrl}collection-featured.png`,
            
            external_link: "https://bashood.com",
            
            seller_fee_basis_points: 250, // 2.5% royalty
            
            fee_recipient: "0x742d35Cc6634C0532925a3b8D4D1C8B1B5c45C00", // Replace with actual address

            properties: {
                category: "Real Estate",
                blockchain: "Ethereum",
                total_supply: 10000,
                property_types: [
                    "House", "Apartment", "Commercial", 
                    "Land", "Villa", "Townhouse", "Penthouse"
                ],
                utility_features: [
                    "Staking Rewards",
                    "Governance Rights", 
                    "Property Revenue Sharing",
                    "Exclusive Community Access"
                ]
            },

            socials: {
                website: "https://bashood.com",
                twitter: "https://twitter.com/BashoodOfficial",
                discord: "https://discord.gg/bashood",
                telegram: "https://t.me/bashood"
            },

            created_date: "2025-11-20T00:00:00Z"
        };
    }

    /**
     * Generate sample property data
     */
    generateSampleProperties() {
        const samples = [
            {
                tokenId: 1,
                name: "Golden Villa Paradise",
                description: "Luxurious villa with stunning golden architecture and premium amenities. Located in an exclusive neighborhood with panoramic views.",
                location: "Beverly Hills, CA",
                propertyType: 5, // Villa
                area: 650,
                estimatedValue: "2500000000000000000000000", // 2.5M USD in wei-scale
                amenities: ["Pool", "Garden", "Garage", "Security", "Gym"],
                imageHash: "QmGoldenVilla123",
                attributes: {
                    "Year Built": 2020,
                    "Bedrooms": 6,
                    "Bathrooms": 4,
                    "Stories": 2,
                    "Architectural Style": "Modern Mediterranean"
                }
            },
            {
                tokenId: 2,
                name: "Downtown Luxury Penthouse",
                description: "Exclusive penthouse in the heart of the city with 360-degree views and world-class amenities.",
                location: "Manhattan, NY", 
                propertyType: 7, // Penthouse
                area: 400,
                estimatedValue: "8000000000000000000000000", // 8M USD
                amenities: ["Elevator", "Balcony", "Air Conditioning", "Security", "Parking"],
                imageHash: "QmPenthouse456",
                attributes: {
                    "Year Built": 2022,
                    "Bedrooms": 4,
                    "Bathrooms": 3,
                    "Floor": 45,
                    "View": "City Skyline"
                }
            },
            {
                tokenId: 3,
                name: "Suburban Family House",
                description: "Perfect family home in quiet suburban neighborhood with excellent schools and community amenities.",
                location: "Austin, TX",
                propertyType: 1, // House
                area: 280,
                estimatedValue: "450000000000000000000000", // 450K USD
                amenities: ["Garden", "Garage", "Fireplace"],
                imageHash: "QmSuburbanHouse789",
                attributes: {
                    "Year Built": 2015,
                    "Bedrooms": 4,
                    "Bathrooms": 2,
                    "Stories": 2,
                    "Lot Size": "0.3 acres"
                }
            }
        ];

        return samples.map(sample => this.generatePropertyMetadata(sample));
    }

    /**
     * Save metadata to files
     */
    saveMetadataFiles() {
        const outputDir = path.join(__dirname, '../metadata');
        
        // Create output directory
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate and save collection metadata
        const collectionMetadata = this.generateCollectionMetadata();
        fs.writeFileSync(
            path.join(outputDir, 'collection.json'),
            JSON.stringify(collectionMetadata, null, 2)
        );

        // Generate and save sample property metadata
        const sampleProperties = this.generateSampleProperties();
        sampleProperties.forEach((property, index) => {
            fs.writeFileSync(
                path.join(outputDir, `${index + 1}.json`),
                JSON.stringify(property, null, 2)
            );
        });

        // Generate index file for easy reference
        const index = {
            collection: "collection.json",
            properties: sampleProperties.map((_, index) => `${index + 1}.json`),
            generated: new Date().toISOString(),
            total_count: sampleProperties.length
        };

        fs.writeFileSync(
            path.join(outputDir, 'index.json'),
            JSON.stringify(index, null, 2)
        );

        console.log(`✅ Generated metadata for ${sampleProperties.length} properties`);
        console.log(`📁 Files saved to: ${outputDir}`);
        
        return {
            collection: collectionMetadata,
            properties: sampleProperties,
            outputDir
        };
    }

    /**
     * Validate metadata against OpenSea standards
     */
    validateMetadata(metadata) {
        const required = ['name', 'description', 'image'];
        const missing = required.filter(field => !metadata[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (metadata.attributes && !Array.isArray(metadata.attributes)) {
            throw new Error('Attributes must be an array');
        }

        if (metadata.attributes) {
            metadata.attributes.forEach((attr, index) => {
                if (!attr.trait_type || attr.value === undefined) {
                    throw new Error(`Invalid attribute at index ${index}: missing trait_type or value`);
                }
            });
        }

        return true;
    }

    /**
     * Generate metadata for a specific token ID
     */
    generateForTokenId(tokenId, propertyData) {
        const metadata = this.generatePropertyMetadata({
            tokenId,
            ...propertyData
        });
        
        this.validateMetadata(metadata);
        
        return metadata;
    }
}

// Command line interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    const generator = new PropertyMetadataGenerator();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'generate':
            console.log('🏠 Generating Bashood Property NFT metadata...');
            const result = generator.saveMetadataFiles();
            console.log('🎉 Metadata generation completed!');
            break;
            
        case 'validate':
            const filePath = process.argv[3];
            if (!filePath) {
                console.error('❌ Please provide a file path to validate');
                process.exit(1);
            }
            try {
                const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                generator.validateMetadata(metadata);
                console.log('✅ Metadata is valid!');
            } catch (error) {
                console.error('❌ Validation failed:', error.message);
                process.exit(1);
            }
            break;
            
        default:
            console.log(`
🏠 Bashood Property NFT Metadata Generator

Usage:
  node generate-nft-metadata.js generate   # Generate sample metadata
  node generate-nft-metadata.js validate <file>  # Validate metadata file

Examples:
  node generate-nft-metadata.js generate
  node generate-nft-metadata.js validate metadata/1.json
            `);
            break;
    }
}

export default PropertyMetadataGenerator;