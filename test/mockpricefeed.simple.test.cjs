const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MockPriceFeed basic behaviors', function () {
  it('returns and updates price and timestamp', async function () {
    const [owner] = await ethers.getSigners();
  const MockPrice = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  // constructor expects (uint8 decimals, int256 answer)
  const feed = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await feed.waitForDeployment();

    // default answer should be set; set and read
  await feed.setAnswer(ethers.parseUnits('1', 8));
  const p = await feed.latestRoundData();
  // latestRoundData returns tuple; _answer is at index 1
  expect(p[1]).to.equal(ethers.parseUnits('1', 8));

  await feed.setAnswer(ethers.parseUnits('2', 8));
  expect((await feed.latestRoundData())[1]).to.equal(ethers.parseUnits('2', 8));
  });
});
