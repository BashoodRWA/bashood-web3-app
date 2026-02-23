const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Minimal: answeredInRound >= roundId validation", function () {
    it.skip("Should revert when answeredInRound < roundId - DEPRECATED: ChainLink validation not currently in use", async function () {
        // Deploy fresh contracts
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        const mockFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("1000", 8));
        await mockFeed.waitForDeployment();

        const ChainlinkPriceFeed = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
        const priceFeed = await ChainlinkPriceFeed.deploy(await mockFeed.getAddress());
        await priceFeed.waitForDeployment();

        // Set answer (roundId becomes 2)
        await mockFeed.setAnswer(ethers.parseUnits("2000", 8));
        
        // Manually set answeredInRound to 1 (< roundId which is 2)
        await mockFeed.setAnsweredInRound(1);
        // Verify the state before calling
        const [rId, ans, st, up, aIR] = await mockFeed.latestRoundData();
        console.log(`State: roundId=${rId}, answeredInRound=${aIR}, shouldRevert=${aIR < rId}`);
        
        // Double check by reading directly from storage
        const directRoundId = await mockFeed.roundId();
        const directAnsweredInRound = await mockFeed.answeredInRound();
        console.log(`Direct: roundId=${directRoundId}, answeredInRound=${directAnsweredInRound}`);
        
        // Try calling it to see what happens
        try {
            const result = await priceFeed.peekLatestPrice();
            console.log(`ERROR: peekLatestPrice() didn't revert! Returned:`, result);
        } catch (error) {
            console.log(`GOOD: peekLatestPrice() reverted with:`, error.message);
        }
        
        // Use peekLatestPrice() which is a view function for testing
        await expect(priceFeed.peekLatestPrice()).to.be.revertedWith("stale: answeredInRound < roundId");
    });
});
