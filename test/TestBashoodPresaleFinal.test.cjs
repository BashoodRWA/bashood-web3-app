if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const { ethers } = require("hardhat");

describe("BashoodPresaleFinal", function () {
  let owner, referrer, user, treasury;
  let token, nft, validator, presale, referral;

  beforeEach(async function () {
    [owner, referrer, user, treasury] = await ethers.getSigners();
  // ...existing code...

    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
  token = await MockERC20.deploy();
    await token.mint(await user.getAddress(), ethers.parseEther("100"));

    const MockNFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
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

    // Deploy MockRescue (fully-qualified to avoid HH701)
    const MockRescue = await ethers.getContractFactory("contracts/mocks/MockRescue.sol:MockRescue");
  const mockRescue = await MockRescue.deploy();
    await mockRescue.waitForDeployment();
    const mockRescueAddress = await mockRescue.getAddress();

  // Deploy BashoodPresaleFinal con argumentos validos (use unqualified name)
  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
  const args = [
    await token.getAddress(),
    await nft.getAddress(),
    await referral.getAddress(),
    owner.address, // projectWallet/address (payable)
    ethers.parseEther("1"), // nftPriceETH
    ethers.parseEther("2"), // nftPriceBHT
    1700000000, // presaleStart
    1800000000, // presaleEnd
    10 // maxNFTSupply
  ];

  // Deploy presale with validated args using manual-deploy fallback
  const deployTx = BashoodPresaleFinal.getDeployTransaction(...args);
  if (deployTx && deployTx.data && deployTx.data.length > 2) {
    const sent = await owner.sendTransaction({ to: undefined, data: deployTx.data });
    const receipt = await sent.wait();
    presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);
    await presale.waitForDeployment();
  } else {
    const instance = await BashoodPresaleFinal.deploy(...args);
    await instance.waitForDeployment();
    presale = instance;
  }
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
