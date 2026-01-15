const { expect } = require("chai");

describe("ChainlinkPriceFeed - stale handling", function () {
  it("reverts when feed updatedAt == 0", async function () {
    const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mock = await Mock.deploy(8, ethers.parseUnits('1000', 8));
    await mock.waitForDeployment();
    // set updatedAt to 0 via low-level call simulation: use setAnswerWithTimestamp
  await mock.setAnswerWithTimestamp(ethers.parseUnits('1000', 8), 0);

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.deploy(mock.getAddress ? await mock.getAddress() : mock.address);
    await wrapper.waitForDeployment();

    await expect(wrapper.peekLatestPrice()).to.be.revertedWith("stale: updatedAt=0");
  });
});






