const { expect } = require("chai");

describe("ChainlinkPriceFeed - max change rejection", function () {
  it("reverts when change is larger than maxChangePct", async function () {
    const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mock = await Mock.deploy(8, ethers.parseUnits('1000', 8)); // 1000
    await mock.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.deploy(await mock.getAddress());
    await wrapper.waitForDeployment();

    // read once to set lastValidAnswer via getLatestPrice (stateful)
    await wrapper.getLatestPrice();

    // now set a huge jump
  await mock.setAnswer(ethers.parseUnits('3000', 8)); // 3000 (200% jump)

    await expect(wrapper.getLatestPrice()).to.be.revertedWith("change too large");
  });
});
