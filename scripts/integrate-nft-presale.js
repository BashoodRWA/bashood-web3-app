const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Integration script for Bashood Property NFT with existing presale system
 * This script demonstrates how to integrate property NFTs with token purchases
 */

async function main() {
    console.log("🔗 Bashood NFT-Presale Integration Setup\n");
    
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("Integration account:", deployer.address);
    
    // Contract addresses (update with your deployed addresses)
    const PROPERTY_NFT_ADDRESS = process.env.PROPERTY_NFT_ADDRESS || "";
    const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS || "";
    const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "";
    
    if (!PROPERTY_NFT_ADDRESS) {
        console.log("⚠️  Property NFT address not provided. Deploying new instance...");
        return deployNewIntegration();
    }
    
    // Connect to existing contracts
    console.log("1. Connecting to deployed contracts...");
    
    const PropertyNFT = await ethers.getContractFactory("BashoodPropertyNFT");
    const propertyNFT = PropertyNFT.attach(PROPERTY_NFT_ADDRESS);
    
    console.log("✅ Connected to PropertyNFT:", PROPERTY_NFT_ADDRESS);
    
    // Verify contract is working
    try {
        const name = await propertyNFT.name();
        const totalSupply = await propertyNFT.totalSupply();
        console.log(`   Contract: ${name}, Total Supply: ${totalSupply}`);
    } catch (error) {
        console.error("❌ Failed to connect to PropertyNFT:", error.message);
        return;
    }
    
    // Create NFT Integration Helper Contract
    console.log("\n2. Deploying NFT Integration Helper...");
    
    const IntegrationHelper = await ethers.getContractFactory("BashoodNFTIntegration");
    const integrationHelper = await IntegrationHelper.deploy(
        PROPERTY_NFT_ADDRESS,
        PRESALE_ADDRESS || ethers.constants.AddressZero,
        TOKEN_ADDRESS || ethers.constants.AddressZero
    );
    await integrationHelper.deployed();
    
    console.log("✅ Integration Helper deployed:", integrationHelper.address);
    
    // Setup integration scenarios
    console.log("\n3. Setting up integration scenarios...");
    
    // Scenario 1: NFT rewards for large token purchases
    console.log("   Setting up NFT rewards for large purchases...");
    
    const rewardTiers = [
        {
            minPurchase: ethers.utils.parseUnits("10000", 18), // 10k tokens
            nftReward: 1, // 1 NFT
            description: "Bronze Investor"
        },
        {
            minPurchase: ethers.utils.parseUnits("50000", 18), // 50k tokens  
            nftReward: 3, // 3 NFTs
            description: "Silver Investor"
        },
        {
            minPurchase: ethers.utils.parseUnits("100000", 18), // 100k tokens
            nftReward: 5, // 5 NFTs
            description: "Gold Investor"
        }
    ];
    
    // Configure reward tiers in integration helper
    for (const tier of rewardTiers) {
        try {
            const setTierTx = await integrationHelper.setRewardTier(
                tier.minPurchase,
                tier.nftReward
            );
            await setTierTx.wait();
            console.log(`   ✅ ${tier.description}: ${ethers.utils.formatUnits(tier.minPurchase, 18)} tokens → ${tier.nftReward} NFTs`);
        } catch (error) {
            console.log(`   ❌ Failed to set ${tier.description}:`, error.message);
        }
    }
    
    // Scenario 2: Special properties for early investors
    console.log("\n4. Creating special properties for early investors...");
    
    const specialProperties = [
        {
            name: "Bashood Genesis Tower",
            description: "Exclusive property for founding investors - Limited Edition #1",
            location: "Dubai, UAE",
            propertyType: 7, // Penthouse
            area: 1200,
            estimatedValue: ethers.utils.parseUnits("15000000", 18), // 15M USD
            amenities: ["Private Elevator", "Helipad", "Infinity Pool", "Smart Home", "Concierge"],
            metadataURI: "https://api.bashood.com/nft/metadata/genesis-1.json"
        },
        {
            name: "Bashood Innovation Hub", 
            description: "Commercial property in tech district - Investor Exclusive",
            location: "Silicon Valley, CA",
            propertyType: 3, // Commercial
            area: 5000,
            estimatedValue: ethers.utils.parseUnits("25000000", 18), // 25M USD
            amenities: ["High-Speed Internet", "Conference Centers", "Parking", "Security", "Cafeteria"],
            metadataURI: "https://api.bashood.com/nft/metadata/innovation-hub.json"
        }
    ];
    
    // Mint special properties (requires authorization)
    try {
        // Check if we have minting permission
        const hasRole = await propertyNFT.hasRole(
            await propertyNFT.AUTHORIZED_MINTER_ROLE(),
            deployer.address
        );
        
        if (!hasRole) {
            console.log("   Granting minter role to deployer...");
            const grantRoleTx = await propertyNFT.grantRole(
                await propertyNFT.AUTHORIZED_MINTER_ROLE(),
                deployer.address
            );
            await grantRoleTx.wait();
            console.log("   ✅ Minter role granted");
        }
        
        for (let i = 0; i < specialProperties.length; i++) {
            const property = specialProperties[i];
            console.log(`   Minting: ${property.name}...`);
            
            const mintTx = await propertyNFT.mintProperty(
                deployer.address, // Will be transferred to winners later
                property.name,
                property.description,
                property.location,
                property.propertyType,
                property.area,
                property.estimatedValue,
                property.amenities,
                property.metadataURI
            );
            
            const receipt = await mintTx.wait();
            const transferEvent = receipt.events?.find(event => event.event === 'Transfer');
            const tokenId = transferEvent?.args?.tokenId;
            
            console.log(`   ✅ Token ID ${tokenId} minted: ${property.name}`);
        }
        
    } catch (error) {
        console.log("   ❌ Failed to mint special properties:", error.message);
    }
    
    // Scenario 3: NFT staking for additional rewards
    console.log("\n5. Setting up NFT staking mechanism...");
    
    try {
        // Enable staking in integration helper
        const enableStakingTx = await integrationHelper.enableNFTStaking(true);
        await enableStakingTx.wait();
        
        // Set staking rewards (tokens per NFT per day)
        const dailyReward = ethers.utils.parseUnits("100", 18); // 100 tokens per NFT per day
        const setRewardTx = await integrationHelper.setStakingReward(dailyReward);
        await setRewardTx.wait();
        
        console.log("   ✅ NFT staking enabled");
        console.log(`   ✅ Daily reward: ${ethers.utils.formatUnits(dailyReward, 18)} tokens per NFT`);
        
    } catch (error) {
        console.log("   ❌ Failed to setup NFT staking:", error.message);
    }
    
    // Scenario 4: Property trading marketplace
    console.log("\n6. Configuring property marketplace...");
    
    try {
        // Set marketplace fee (2.5%)
        const marketplaceFee = 250; // 2.5% in basis points
        const setFeeTx = await integrationHelper.setMarketplaceFee(marketplaceFee);
        await setFeeTx.wait();
        
        // Enable marketplace
        const enableMarketplaceTx = await integrationHelper.enableMarketplace(true);
        await enableMarketplaceTx.wait();
        
        console.log("   ✅ Marketplace enabled");
        console.log(`   ✅ Marketplace fee: ${marketplaceFee / 100}%`);
        
    } catch (error) {
        console.log("   ❌ Failed to setup marketplace:", error.message);
    }
    
    // Demo transactions
    console.log("\n7. Running integration demo...");
    
    await runIntegrationDemo(propertyNFT, integrationHelper, [user1, user2]);
    
    // Integration summary
    console.log("\n📋 Integration Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🏠 Property NFT: ${propertyNFT.address}`);
    console.log(`🔗 Integration Helper: ${integrationHelper.address}`);
    console.log(`🎯 Total Properties: ${await propertyNFT.totalSupply()}`);
    console.log(`💰 Minting Price: ${ethers.utils.formatEther(await propertyNFT.mintingPrice())} ETH`);
    
    // Save integration config
    const integrationConfig = {
        network: hre.network.name,
        propertyNFT: propertyNFT.address,
        integrationHelper: integrationHelper.address,
        rewardTiers: rewardTiers,
        specialProperties: specialProperties.map((p, i) => ({
            ...p,
            tokenId: i + 1 // Assuming sequential minting
        })),
        stakingEnabled: true,
        marketplaceEnabled: true,
        deploymentTime: new Date().toISOString()
    };
    
    const fs = require('fs');
    const path = require('path');
    const configFile = path.join(__dirname, '../deployments/nft-integration-config.json');
    fs.writeFileSync(configFile, JSON.stringify(integrationConfig, null, 2));
    
    console.log(`\n💾 Integration config saved to: ${configFile}`);
    
    console.log("\n🚀 Integration Features Available:");
    console.log("• NFT rewards for large token purchases");
    console.log("• Special properties for early investors");
    console.log("• NFT staking for additional token rewards");
    console.log("• Property marketplace with trading");
    console.log("• Cross-contract integration utilities");
    
    return integrationConfig;
}

/**
 * Deploy new integration if addresses not provided
 */
async function deployNewIntegration() {
    console.log("🏗️  Deploying complete NFT integration system...");
    
    // This would deploy PropertyNFT, mock presale, and integration contracts
    // For brevity, showing concept
    
    const PropertyNFT = await ethers.getContractFactory("BashoodPropertyNFT");
    const propertyNFT = await PropertyNFT.deploy(
        "Bashood Property Collection",
        "BPROP", 
        "https://api.bashood.com/nft/metadata/",
        10000
    );
    await propertyNFT.deployed();
    
    console.log("✅ New PropertyNFT deployed:", propertyNFT.address);
    
    // Continue with integration setup using new address
    process.env.PROPERTY_NFT_ADDRESS = propertyNFT.address;
    return main();
}

/**
 * Run integration demo scenarios
 */
async function runIntegrationDemo(propertyNFT, integrationHelper, users) {
    console.log("   Running demo scenarios...");
    
    try {
        // Demo: User qualifies for NFT reward
        const [user1, user2] = users;
        
        // Simulate large token purchase (this would come from presale contract)
        console.log("   → Simulating large token purchase by user1...");
        
        // Check if user1 qualifies for NFT reward
        const qualification = await integrationHelper.checkNFTRewardQualification(
            user1.address,
            ethers.utils.parseUnits("25000", 18) // 25k token purchase
        );
        
        console.log(`   → User1 qualifies for ${qualification} NFTs`);
        
        if (qualification.gt(0)) {
            console.log("   → Processing NFT reward...");
            // This would be called by presale contract in real integration
        }
        
        console.log("   ✅ Demo scenarios completed");
        
    } catch (error) {
        console.log("   ❌ Demo failed:", error.message);
    }
}

// Run the integration
main()
    .then(() => {
        console.log("\n🎉 NFT-Presale integration completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Integration failed:", error);
        process.exit(1);
    });