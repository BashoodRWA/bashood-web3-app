const { expect } = require("chai");

describe("ChainlinkPriceFeed - answeredInRound and maxChangePct boundary", function () {
  it("reverts when answeredInRound == 0", async function () {
    const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mock = await Mock.deploy(8, 1000_00000000);
    await mock.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.deploy(await mock.getAddress());
    await wrapper.waitForDeployment();

    // force answeredInRound to zero
    await mock.setAnsweredInRound(0);

    await expect(wrapper.peekLatestPrice()).to.be.revertedWith("invalid: answeredInRound=0");
  });

  it("allows change equal to maxChangePct and rejects greater", async function () {
    const Mock = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mock = await Mock.deploy(8, 1000_00000000);
    await mock.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("contracts/oracles/ChainlinkPriceFeed.sol:ChainlinkPriceFeed");
    const wrapper = await Wrapper.deploy(await mock.getAddress());
    await wrapper.waitForDeployment();

    // initialize lastValidAnswer
    await wrapper.getLatestPrice();

  // set a 50% increase (default maxChangePct = 50) - should be allowed
  await mock.setAnswer(1500_00000000);
  // use view helper instead of callStatic to read the current price
  const ok = await wrapper.peekLatestPrice();
  expect(ok[0].toString()).to.equal("150000000000");

  // now set comfortably above threshold -> should revert
  await mock.setAnswer(1510_00000000);
  await expect(wrapper.getLatestPrice()).to.be.revertedWith("change too large");
  });
});
