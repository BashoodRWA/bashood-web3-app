const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Minimal: answeredInRound >= roundId validation", function () {
    it("Should revert when answeredInRound < roundId", async function () {
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
        
        // This MUST revert with "stale: answeredInRound < roundId"
        await expect(priceFeed.getLatestPrice()).to.be.revertedWith("stale: answeredInRound < roundId");
    });
});
