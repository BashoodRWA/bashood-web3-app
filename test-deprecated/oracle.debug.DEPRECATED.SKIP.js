const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployPresale } = require("./helpers/presaleHelpers");

describe("Oracle Debug Tests", function () {
    let bashoodPresale, mockPriceFeed, bashoodToken, owner, buyer;

    it("Debug oracle call", async function () {
        // Use existing helper to set up the presale correctly
        ({ owner, buyer, presale: bashoodPresale, bht: bashoodToken } = await deployPresale());

        // Mock Chainlink Aggregator  
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("100", 8)); // decimals, $100 
        await mockPriceFeed.waitForDeployment();

        // Set the price feed and staleness
        await bashoodPresale.connect(owner).setPriceFeed(await mockPriceFeed.getAddress());
        await bashoodPresale.connect(owner).setMaxPriceStaleness(3600); // 1 hora
        
        // Set operations wallet  
        await bashoodPresale.connect(owner).setOperationsWallet(owner.address);
        console.log("Operations wallet set to:", owner.address);
        
        // Mint tokens to owner
        await bashoodToken.mint(owner.address, ethers.parseEther("1000"));
        console.log("Minted 1000 BHT to owner");
        
        // Update price to be fresh
        console.log("Setting fresh price...");
        await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
        
        // Get latest round data for debugging
        const roundData = await mockPriceFeed.latestRoundData();
        console.log("Round data:", {
            roundId: roundData[0],
            answer: roundData[1].toString(),
            startedAt: roundData[2],
            updatedAt: roundData[3],
            answeredInRound: roundData[4]
        });
        
        const currentBlock = await time.latest();
        console.log("Current block timestamp:", currentBlock);
        console.log("Price age:", currentBlock - Number(roundData[3]));
        
        const staleness = await bashoodPresale.maxPriceStaleness();
        console.log("Max staleness:", staleness);
        
        // Check if we can call _getFreshPrice directly
        try {
            // Try calling a function that uses _getFreshPrice
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            console.log("Attempting submitProposal...");
            const tx = await bashoodPresale.connect(owner).submitProposal("0x", deposit);
            const receipt = await tx.wait();
            console.log("SUCCESS: Oracle validation passed, gas used:", receipt.gasUsed);
        } catch (error) {
            console.log("ERROR details:", error);
            console.log("ERROR reason:", error.reason || error.message);
            
            // Try to understand what's failing
            const priceFeedAddress = await bashoodPresale.priceFeed();
            console.log("PriceFeed address:", priceFeedAddress);
            console.log("MockPriceFeed address:", await mockPriceFeed.getAddress());
            
            const opsWallet = await bashoodPresale.operationsWallet();
            console.log("Operations wallet:", opsWallet);
            
            const isPaused = await bashoodPresale.paused();
            console.log("Is paused:", isPaused);
        }
    });
});





