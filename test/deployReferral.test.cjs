if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("Deploy BashoodReferral - test mínimo", function () {
  it("debería desplegar BashoodReferral con argumentos válidos", async function () {
    const [owner] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Validator = await ethers.getContractFactory("ReferralValidator");
    const validator = await Validator.deploy(owner.address);
    await validator.waitForDeployment();

  const NFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await NFT.deploy();
    await nft.waitForDeployment();

  const Referral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
  const referral = await Referral.deploy(owner.address, await validator.getAddress(), await nft.getAddress());
    await referral.waitForDeployment();
    expect(await referral.getAddress()).to.be.properAddress;
  });
});
