import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = hre;

async function main() {
    console.log("🏠 Deploying Bashood Property NFT System...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    
    // Network validation
    const network = await hre.network.name;
    console.log("Network:", network);
    
    if (network === "mainnet") {
        console.log("⚠️  MAINNET DEPLOYMENT - Please confirm this is intentional");
        // Add confirmation prompt for mainnet
    }
    
    // Deploy PropertyNFT
    console.log("\n1. Deploying BashoodPropertyNFT...");
    const PropertyNFT = await ethers.getContractFactory("BashoodPropertyNFT");
    
    // Constructor parameters
    const baseTokenURI = "https://api.bashood.com/nft/metadata/";
    
    const propertyNFT = await PropertyNFT.deploy(baseTokenURI);
    await propertyNFT.waitForDeployment();
    
    console.log("✅ BashoodPropertyNFT deployed to:", propertyNFT.target);
    console.log("   Base URI:", baseTokenURI);
    
    // Verify deployment
    const deployedName = await propertyNFT.name();
    const deployedSymbol = await propertyNFT.symbol();
    const deployedMaxSupply = await propertyNFT.MAX_SUPPLY();
    
    console.log("\n📋 Deployment Verification:");
    console.log("   Contract Name:", deployedName);
    console.log("   Contract Symbol:", deployedSymbol);
    console.log("   Max Supply:", deployedMaxSupply.toString());
    console.log("   Owner:", await propertyNFT.owner());
    
    // Setup initial configuration
    console.log("\n2. Configuring initial settings...");
    
    // Enable public minting (optional, can be done later)
    const enablePublicMinting = false; // Change to true if desired
    if (enablePublicMinting) {
        console.log("   Enabling public minting...");
        const publicMintTx = await propertyNFT.setPublicMintingEnabled(true);
        await publicMintTx.wait();
        console.log("   ✅ Public minting enabled");
    }
    
    // Set minting price (in ETH)
    const mintingPriceETH = "0.1"; // 0.1 ETH
    const mintingPrice = ethers.parseEther(mintingPriceETH);
    console.log(`   Setting minting price to ${mintingPriceETH} ETH...`);
    const priceTx = await propertyNFT.setMintingFee(mintingPrice);
    await priceTx.wait();
    console.log("   ✅ Minting price set");
    
    // Mint some initial properties for demo/testing
    console.log("\n3. Minting initial demo properties...");
    
    const demoProperties = [
        {
            to: deployer.address,
            name: "Golden Villa Paradise", 
            description: "Luxurious villa with stunning architecture",
            location: "Beverly Hills, CA",
            propertyType: 5, // Villa
            area: 650,
            estimatedValue: ethers.parseUnits("2500000", 18), // 2.5M USD
            amenities: ["Pool", "Garden", "Garage", "Security", "Gym"],
            metadataURI: "https://api.bashood.com/nft/metadata/demo-1.json"
        },
        {
            to: deployer.address,
            name: "Downtown Luxury Penthouse",
            description: "Exclusive penthouse with city views",
            location: "Manhattan, NY",
            propertyType: 7, // Penthouse  
            area: 400,
            estimatedValue: ethers.parseUnits("8000000", 18), // 8M USD
            amenities: ["Elevator", "Balcony", "Security", "Parking"],
            metadataURI: "https://api.bashood.com/nft/metadata/demo-2.json"
        },
        {
            to: deployer.address,
            name: "Suburban Family House",
            description: "Perfect family home in quiet neighborhood",
            location: "Austin, TX", 
            propertyType: 1, // House
            area: 280,
            estimatedValue: ethers.parseUnits("450000", 18), // 450K USD
            amenities: ["Garden", "Garage", "Fireplace"],
            metadataURI: "https://api.bashood.com/nft/metadata/demo-3.json"
        }
    ];
    
    const mintedTokens = [];
    for (let i = 0; i < demoProperties.length; i++) {
        const property = demoProperties[i];
        console.log(`   Minting property ${i + 1}: ${property.name}...`);
        
        try {
            const propertyData = {
                name: property.name,
                description: property.description,
                location: property.location,
                propertyType: property.propertyType,
                area: property.area,
                estimatedValue: property.estimatedValue,
                mintTimestamp: 0, // Will be set by contract
                isActive: true, // Will be set by contract
                amenities: property.amenities,
                imageHash: property.imageHash || "",
                originalOwner: "0x0000000000000000000000000000000000000000" // Will be set by contract
            };
            
            const mintTx = await propertyNFT.mintProperty(
                property.to,
                propertyData,
                property.metadataURI
            );
            
            const receipt = await mintTx.wait();
            
            // Find the token ID from events
            const transferEvent = receipt.events?.find(event => event.event === 'Transfer');
            const tokenId = transferEvent?.args?.tokenId;
            
            mintedTokens.push({
                tokenId: tokenId?.toString(),
                name: property.name,
                txHash: receipt.transactionHash
            });
            
            console.log(`   ✅ Token ID ${tokenId} minted for ${property.name}`);
            
        } catch (error) {
            console.log(`   ❌ Failed to mint ${property.name}:`, error.message);
        }
    }
    
    // Display final statistics
    console.log("\n📊 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🏠 Contract Address: ${propertyNFT.target}`);
    console.log(`🌐 Network: ${network}`);
    console.log(`👤 Owner: ${deployer.address}`);
    console.log(`💰 Minting Price: ${ethers.formatEther(await propertyNFT.mintingFee())} ETH`);
    console.log(`🎯 Max Supply: ${deployedMaxSupply}`);
    console.log(`📝 Minted Properties: ${mintedTokens.length}`);
    
    if (mintedTokens.length > 0) {
        console.log("\n🏘️  Minted Properties:");
        mintedTokens.forEach((token, index) => {
            console.log(`   ${index + 1}. Token ID ${token.tokenId}: ${token.name}`);
        });
    }
    
    // Integration checks
    console.log("\n4. Performing integration checks...");
    
    try {
        const totalSupply = await propertyNFT.totalSupply();
        console.log(`   Current total supply: ${totalSupply}`);
        
        const contractBalance = await ethers.provider.getBalance(propertyNFT.target);
        console.log(`   Contract balance: ${ethers.formatEther(contractBalance)} ETH`);
        
        const isPaused = await propertyNFT.paused();
        console.log(`   Contract paused: ${isPaused}`);
        
        const publicMintingEnabled = await propertyNFT.publicMintingEnabled();
        console.log(`   Public minting enabled: ${publicMintingEnabled}`);
        
        console.log("   ✅ All checks passed");
        
    } catch (error) {
        console.log("   ❌ Integration check failed:", error.message);
    }
    
    // Save deployment info
    const deploymentInfo = {
        network: network,
        contractAddress: propertyNFT.target,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        contractDetails: {
            name: deployedName,
            symbol: deployedSymbol,
            maxSupply: deployedMaxSupply.toString(),
            baseTokenURI: baseTokenURI,
            mintingPrice: mintingPrice.toString()
        },
        mintedTokens: mintedTokens,
        transactionHashes: {
            deployment: propertyNFT.deploymentTransaction().hash
        }
    };
    
    // Write deployment info to file
    const deploymentsDir = path.join(__dirname, '../deployments');
    
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `property-nft-${network}-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
    
    // Contract verification instructions
    if (network !== "hardhat" && network !== "localhost") {
        console.log("\n🔍 Contract Verification:");
        console.log("Run the following command to verify on Etherscan:");
        console.log(`npx hardhat verify --network ${network} ${propertyNFT.target} "${baseTokenURI}"`);
    }
    
    // Next steps
    console.log("\n🚀 Next Steps:");
    console.log("1. Update your frontend with the new contract address");
    console.log("2. Upload metadata to IPFS or your metadata server");
    console.log("3. Configure authorized minters if needed");
    console.log("4. Set up property management roles");
    console.log("5. Test minting functionality thoroughly");
    console.log("6. Consider setting up automated property data feeds");
    
    console.log("\n✨ Bashood Property NFT deployment completed successfully!");
    
    return {
        propertyNFT: propertyNFT,
        deploymentInfo: deploymentInfo,
        mintedTokens: mintedTokens
    };
}

// Enhanced error handling
main()
    .then((result) => {
        console.log("\n🎉 Deployment script completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Deployment failed:", error);
        
        // Enhanced error reporting
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error("❌ Insufficient funds for deployment. Please ensure your account has enough ETH.");
        } else if (error.code === 'NETWORK_ERROR') {
            console.error("❌ Network connection error. Please check your RPC endpoint.");
        } else if (error.message.includes('revert')) {
            console.error("❌ Transaction reverted. Check constructor parameters and contract code.");
        }
        
        process.exit(1);
    });