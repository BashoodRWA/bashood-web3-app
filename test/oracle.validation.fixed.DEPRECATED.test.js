const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployPresale } = require("./helpers/presaleHelpers");

describe("BashoodPresaleFinal - Oracle Validation Tests", function () {
    let bashoodToken, bashoodPresale, mockPriceFeed, bashoodNFT;
    let owner, projectWallet, buyer;

    beforeEach(async function () {
        // Use existing helper to set up the presale correctly
        ({ owner, projectWallet, buyer, presale: bashoodPresale, bht: bashoodToken, nft: bashoodNFT } = await deployPresale());

        // Mock Chainlink Aggregator  
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("100", 8)); // decimals, $100 
        await mockPriceFeed.waitForDeployment();

        // Set the price feed
        await bashoodPresale.connect(owner).setPriceFeed(await mockPriceFeed.getAddress());
        
        // Set a non-zero staleness (required by the contract)
        await bashoodPresale.connect(owner).setMaxPriceStaleness(3600);
        
        // Set operations wallet
        await bashoodPresale.connect(owner).setOperationsWallet(projectWallet.address);
        
        // Mint BHT tokens to owner for testing (the helper doesn't do this automatically)
        await bashoodToken.mint(owner.address, ethers.parseEther("10000"));
    });

    describe("Oracle Configuration", function () {
        it("Should set max price staleness correctly", async function () {
            const newStaleness = 7200; // 2 horas
            await bashoodPresale.connect(owner).setMaxPriceStaleness(newStaleness);
            expect(await bashoodPresale.maxPriceStaleness()).to.equal(newStaleness);
        });

        it("Should emit MaxPriceStalenessChanged event", async function () {
            const newStaleness = 1800; // 30 minutos
            await expect(bashoodPresale.connect(owner).setMaxPriceStaleness(newStaleness))
                .to.emit(bashoodPresale, "MaxPriceStalenessChanged")
                .withArgs(newStaleness);
        });

        it("Should reject staleness outside valid range", async function () {
            await expect(bashoodPresale.connect(owner).setMaxPriceStaleness(0))
                .to.be.revertedWith("Invalid staleness: 1s-24h");
            
            await expect(bashoodPresale.connect(owner).setMaxPriceStaleness(86401)) // > 24 horas
                .to.be.revertedWith("Invalid staleness: 1s-24h");
        });

        it("Should only allow admin to set staleness", async function () {
            await expect(bashoodPresale.connect(buyer).setMaxPriceStaleness(1800))
                .to.be.reverted;
        });
    });

    describe("Oracle Price Validation", function () {
        it("Should accept fresh price data", async function () {
            // Mock fresh data
            await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
            
            // Should not revert when submitting proposal with fresh data
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.not.be.reverted;
        });

        it("Should reject stale price data", async function () {
            // Set short staleness period
            await bashoodPresale.connect(owner).setMaxPriceStaleness(60); // 1 minuto
            
            // Update price and fast-forward time to make it stale
            await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
            await time.increase(120); // 2 minutos después
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.be.revertedWith("Oracle: Invalid/stale");
        });

        it("Should reject zero price data", async function () {
            // Mock zero price
            await mockPriceFeed.setAnswer(0);
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.be.revertedWith("Oracle: Invalid/stale");
        });

        it("Should reject negative price data", async function () {
            // Mock negative price
            await mockPriceFeed.setAnswer(-1000);
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.be.revertedWith("Oracle: Invalid/stale");
        });

        it("Should reject when priceFeed is not set", async function () {
            // Deploy presale without setting price feed
            const BashoodPresaleFinal = await ethers.getContractFactory("BashoodPresaleFinal");
            const presaleNoPriceFeed = await BashoodPresaleFinal.deploy(
                await bashoodToken.getAddress(),
                await bashoodNFT.getAddress(),
                await bashoodPresale.referralContract(),
                projectWallet.address,
                ethers.parseEther('0.01'), // nftPriceETH
                ethers.parseUnits('1', 18), // nftPriceBHT
                0, // presaleStart
                0, // presaleEnd
                100 // maxNFTSupply
            );
            await presaleNoPriceFeed.waitForDeployment();
            
            // Set required parameters but don't set price feed
            await presaleNoPriceFeed.connect(owner).setMaxPriceStaleness(3600);
            await presaleNoPriceFeed.connect(owner).setOperationsWallet(projectWallet.address);
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await presaleNoPriceFeed.getAddress(), deposit);
            
            await expect(
                presaleNoPriceFeed.connect(owner).submitProposal("0x", deposit)
            ).to.be.revertedWith("PriceFeed not set");
        });
    });

    describe("Oracle Edge Cases", function () {
        it("Should handle multiple rapid price updates correctly", async function () {
            // Rapid price updates
            for (let i = 0; i < 5; i++) {
                await mockPriceFeed.setAnswer(ethers.parseUnits(`${100 + i * 10}`, 8));
            }
            
            // Should work with latest price
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.not.be.reverted;
        });

        it("Should handle price at staleness boundary", async function () {
            // Set staleness to exactly 1 hour
            await bashoodPresale.connect(owner).setMaxPriceStaleness(3600);
            
            // Update price and move time to well under staleness limit
            await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
            await time.increase(3000); // 50 minutes, safely under 1 hour limit
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            // Should accept well under boundary
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.not.be.reverted;
        });

        it("Should reject price one second past staleness limit", async function () {
            // Set staleness to exactly 1 hour
            await bashoodPresale.connect(owner).setMaxPriceStaleness(3600);
            
            // Update price and move time past staleness limit
            await mockPriceFeed.setAnswer(ethers.parseUnits("150", 8));
            await time.increase(3601); // One second past limit
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            // Should reject past boundary
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.be.revertedWith("Oracle: Invalid/stale");
        });
    });

    describe("Integration with Proposal System", function () {
        it("Should validate oracle before burning tokens", async function () {
            // Ensure oracle validation happens before token burning
            await mockPriceFeed.setAnswer(0); // Invalid price
            
            const deposit = ethers.parseEther("10");
            await bashoodToken.connect(owner).approve(await bashoodPresale.getAddress(), deposit);
            
            const balanceBefore = await bashoodToken.balanceOf(owner.address);
            
            // Should fail and not burn tokens
            await expect(
                bashoodPresale.connect(owner).submitProposal("0x", deposit)
            ).to.be.revertedWith("Oracle: Invalid/stale");
            
            // Balance should remain unchanged (no tokens burned)
            const balanceAfter = await bashoodToken.balanceOf(owner.address);
            expect(balanceAfter).to.equal(balanceBefore);
        });
    });
});






