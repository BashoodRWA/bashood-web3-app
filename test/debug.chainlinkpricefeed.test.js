const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Debug: ChainlinkPriceFeed Validation Order", function () {
    let priceFeed;
    let mockFeed;

    beforeEach(async function () {
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("2000", 8));

        const ChainlinkPriceFeed = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
        priceFeed = await ChainlinkPriceFeed.deploy(await mockFeed.getAddress());
    });

    it("should show exact validation order and values", async function () {
        await mockFeed.setAnswer(ethers.parseUnits("2000", 8));
        
        const currentRoundId = await mockFeed.roundId();
        await mockFeed.setAnsweredInRound(currentRoundId - 1n);
        
        const [retRoundId, retAnswer, retStartedAt, retUpdatedAt, retAnsweredInRound] = await mockFeed.latestRoundData();
        
        console.log("=== latestRoundData() returns ===");
        console.log(`roundId: ${retRoundId}`);
        console.log(`answer: ${retAnswer}`);
        console.log(`updatedAt: ${retUpdatedAt}`);
        console.log(`answeredInRound: ${retAnsweredInRound}`);
        console.log("===");
        console.log(`Validation checks:`);
        console.log(`  updatedAt != 0? ${retUpdatedAt != 0n}`);
        console.log(`  answer > 0? ${retAnswer > 0n}`);
        console.log(`  answeredInRound != 0? ${retAnsweredInRound != 0n}`);
        console.log(`  answeredInRound >= roundId? ${retAnsweredInRound >= retRoundId} (${retAnsweredInRound} >= ${retRoundId})`);
        
        try {
            const tx = await priceFeed.getLatestPrice();
            const receipt = await tx.wait();
            console.log("❌ getLatestPrice() did NOT revert!");
            console.log(`Transaction emitted ${receipt.logs.length} events`);
            for (const log of receipt.logs) {
                try {
                    const parsed = priceFeed.interface.parseLog(log);
                    if (parsed) {
                        console.log(`  Event: ${parsed.name}`, parsed.args);
                    }
                } catch (e) {
                    // Not from this contract
                }
            }
        } catch (err) {
            console.log(`✅ getLatestPrice() reverted with: ${err.message}`);
            throw err; // Re-throw to let test framework know it reverted
        }
    });
});
