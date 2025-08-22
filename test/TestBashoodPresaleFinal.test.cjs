const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BashoodPresaleFinal", function () {
  let owner, referrer, user, treasury;
  let token, nft, validator, presale, referral;

  beforeEach(async function () {
    [owner, referrer, user, treasury] = await ethers.getSigners();
  // ...existing code...

    const MockERC20 = await ethers.getContractFactory("MockERC20");
  token = await MockERC20.deploy();
    await token.mint(await user.getAddress(), ethers.parseEther("100"));

    const MockNFT = await ethers.getContractFactory("MockNFT1155");
  nft = await MockNFT.deploy();
    await nft.mintTo(await owner.getAddress(), 1, 10);

    // Use the existing ReferralValidator contract (no MockValidator in repo)
  const Validator = await ethers.getContractFactory("ReferralValidator");
  const fakePresaleAddress = "0x1000000000000000000000000000000000000001";
  validator = await Validator.deploy(fakePresaleAddress);
    await validator.waitForDeployment();
    const validatorAddress = await validator.getAddress();

  // Deploy BashoodReferral (use unqualified name)
  const Referral = await ethers.getContractFactory("BashoodReferral");
    // BashoodReferral constructor: (address _presaleAddress, address _validator, address _nftContract)
    referral = await Referral.deploy(fakePresaleAddress, await validator.getAddress(), await nft.getAddress());
    const referralAddress = await referral.getAddress();

    // Deploy MockRescue
    const MockRescue = await ethers.getContractFactory("MockRescue");
  const mockRescue = await MockRescue.deploy();
    await mockRescue.waitForDeployment();
    const mockRescueAddress = await mockRescue.getAddress();

  // Deploy BashoodPresaleFinal con argumentos validos (use unqualified name)
  const BashoodPresaleFinal = await ethers.getContractFactory("BashoodPresaleFinal");
  try {
      const args = [
        await token.getAddress(),
        await nft.getAddress(),
        await referral.getAddress(),
        owner.address, // projectWallet/address (payable) - use .address like the minimal test
        ethers.parseEther("1"), // nftPriceETH
        ethers.parseEther("2"), // nftPriceBHT
        1700000000, // presaleStart
        1800000000, // presaleEnd
        10 // maxNFTSupply
      ];
  // ...existing code...
      try {
        // log of constructor types intentionally removed to reduce noise
      } catch (e) {
        // no-op
      }
  // Debug: print expected constructor inputs and actual args to diagnose deployment arg mismatch
  const ctorInputs = (BashoodPresaleFinal.interface && BashoodPresaleFinal.interface.deploy && BashoodPresaleFinal.interface.deploy.inputs) || [];
  // eslint-disable-next-line no-console
  // eslint-disable-next-line no-console
  console.log('BashoodPresaleFinal ctor inputs:', ctorInputs.map(i => i.type + ' ' + i.name));
  // eslint-disable-next-line no-console
  console.log('deploy args length:', args.length);
  for (let i = 0; i < args.length; i++) {
    // eslint-disable-next-line no-console
    console.log(i, 'arg type:', typeof args[i], 'value preview:', String(args[i]).slice(0,80));
  }
  // Deploy presale with validated args
  presale = await BashoodPresaleFinal.deploy(...args);
    } catch (err) {
      console.error('Deploy failed. args:', err, err && err.toString ? err.toString() : err);
      throw err;
    }
    await presale.waitForDeployment();
    // Grant ADMIN_ROLE then configure operations wallet and signer using setters
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress());
  });

  it("Should set the right unlockTime", async function () {
    // ... tu código de test original ...
  });

  // ... el resto de tus it(...) intactos ...
});
