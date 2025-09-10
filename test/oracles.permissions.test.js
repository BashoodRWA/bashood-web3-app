const { expect } = require("chai");

describe("ChainlinkPriceFeed - permissions", function () {
  it("setFeed onlyOwner", async function () {
    const [owner, other] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mock = await Mock.connect(owner).deploy(8, 2000_00000000);
    await mock.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.connect(owner).deploy(await mock.getAddress());
    await wrapper.waitForDeployment();

    // other tries to set feed
    await expect(wrapper.connect(other).setFeed(await mock.getAddress())).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
