const { expect } = require("chai");

describe("ChainlinkPriceFeed wrapper", function () {
  it("compiles and returns latest price from mock", async function () {
  const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mock = await Mock.deploy(8, ethers.parseUnits('2000', 8)); // 2000.0 with 8 decimals
  await mock.waitForDeployment();

  const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
  const mockAddr = await mock.getAddress();
  const wrapper = await Wrapper.deploy(mockAddr);
  await wrapper.waitForDeployment();

  // call the view helper
  const res = await wrapper.peekLatestPrice();
  expect(res[0].toString()).to.equal("200000000000");
  expect(res[1]).to.equal(8);
  });
});






