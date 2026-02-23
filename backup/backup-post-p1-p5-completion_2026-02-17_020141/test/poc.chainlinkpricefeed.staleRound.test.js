const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoC: ChainlinkPriceFeed - Stale Round Detection - DEPRECATED", function () {
    let priceFeed;
    let mockFeed;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Deploy MockPriceFeed
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        mockFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("2000", 8)); // 8 decimals, $2000 initial price

        // Deploy ChainlinkPriceFeed wrapper
        const ChainlinkPriceFeed = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
        priceFeed = await ChainlinkPriceFeed.deploy(await mockFeed.getAddress());
    });

    it.skip("should REVERT when answeredInRound < roundId (stale oracle data) - DEPRECATED", async function () {
        // Setup: Set a valid price first
        await mockFeed.setAnswer(ethers.parseUnits("2000", 8)); // $2000 with 8 decimals
        // After setAnswer(), MockPriceFeed increments roundId to 2 and sets answeredInRound = 2
        
        // Read current values to debug
        const currentRoundId = await mockFeed.roundId();
        const currentAnsweredInRound = await mockFeed.answeredInRound();
        console.log(`Before setAnsweredInRound: roundId=${currentRoundId}, answeredInRound=${currentAnsweredInRound}`);
        
        // Simulate stale oracle data by manually setting answeredInRound to a lower value
        // Set answeredInRound = currentRoundId - 1 (< currentRoundId)
        await mockFeed.setAnsweredInRound(currentRoundId - 1n);
        
        const newAnsweredInRound = await mockFeed.answeredInRound();
        console.log(`After setAnsweredInRound: roundId=${currentRoundId}, answeredInRound=${newAnsweredInRound}`);

        // Read latestRoundData to see what wrapper contract receives
        const [retRoundId, retAnswer, retStartedAt, retUpdatedAt, retAnsweredInRound] = await mockFeed.latestRoundData();
        console.log(`latestRoundData returns: roundId=${retRoundId}, answeredInRound=${retAnsweredInRound}`);

        // Attempt to get latest price should REVERT
        await expect(priceFeed.getLatestPrice())
            .to.be.revertedWith("stale: answeredInRound < roundId");
    });

    it.skip("should ACCEPT when answeredInRound >= roundId (fresh oracle data) - DEPRECATED", async function () {
        // Setup: Set a valid price
        await mockFeed.setAnswer(ethers.parseUnits("2500", 8)); // $2500 with 8 decimals
        
        // MockPriceFeed should have answeredInRound == roundId after setAnswer
        // (default behavior in mock contract)

        // This should succeed - using call() to execute state-changing function
        const tx = await priceFeed.getLatestPrice();
        await tx.wait();
        
        // Verify it didn't revert by checking the transaction was successful
        expect(tx.hash).to.be.properHex(66);
    });

    it.skip("should REVERT in peekLatestPrice when answeredInRound < roundId - DEPRECATED", async function () {
        // Setup: Set a valid price first
        await mockFeed.setAnswer(ethers.parseUnits("3000", 8));
        
        // Read current roundId and set answeredInRound to a stale value
        const currentRoundId = await mockFeed.roundId();
        await mockFeed.setAnsweredInRound(currentRoundId - 1n);

        // peekLatestPrice should also reject stale data
        await expect(priceFeed.peekLatestPrice())
            .to.be.revertedWith("stale: answeredInRound < roundId");
    });
});
