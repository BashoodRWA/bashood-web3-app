const { expect } = require("chai");

describe("ChainlinkPriceFeed - decimals handling", function () {
  it("returns correct decimals and price from mock", async function () {
    const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mock = await Mock.deploy(6, 123456789); // 6 decimals
    await mock.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.deploy(await mock.getAddress());
    await wrapper.waitForDeployment();

    const res = await wrapper.peekLatestPrice();
    expect(res[1]).to.equal(6);
    expect(res[0].toString()).to.equal("123456789");
  });
});
