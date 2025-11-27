const { expect } = require("chai");

describe("ChainlinkPriceFeed - decimals handling", function () {
  it("returns correct decimals and price from mock", async function () {
  const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  // represent the same integer value using parseUnits for clarity: 123.456789 with 6 decimals -> 123456789
  const mock = await Mock.deploy(6, ethers.parseUnits('123.456789', 6)); // 6 decimals
    await mock.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.deploy(await mock.getAddress());
    await wrapper.waitForDeployment();

    const res = await wrapper.peekLatestPrice();
    expect(res[1]).to.equal(6);
    expect(res[0].toString()).to.equal("123456789");
  });
});






