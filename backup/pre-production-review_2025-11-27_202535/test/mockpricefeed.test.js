const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockPriceFeed Test", function () {
    let mockPriceFeed;

    beforeEach(async function () {
        const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
        console.log("MockPriceFeed constructor args: 8 decimals, 100e8 price");
        mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits("100", 8));
        await mockPriceFeed.waitForDeployment();
    });

    it("Should deploy successfully", async function () {
        expect(await mockPriceFeed.decimals()).to.equal(8);
        expect(await mockPriceFeed.answer()).to.equal(ethers.parseUnits("100", 8));
    });

    it("Should return latest round data", async function () {
        const result = await mockPriceFeed.latestRoundData();
        console.log("Latest round data:", result);
        expect(result[1]).to.equal(ethers.parseUnits("100", 8)); // answer
    });
});





