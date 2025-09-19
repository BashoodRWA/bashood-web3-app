if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { setPriceFresh } = getPresaleHelpers();

describe("BashoodPresaleFinal - focused2", function () {
  let owner, buyer, referrer, projectWallet;
  let mockBHT, mockNFT, referral, presale;

  beforeEach(async function () {
    [owner, buyer, referrer, projectWallet] = await ethers.getSigners();

  const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
  mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
  await mockNFT.mint(await owner.getAddress(), 1, 10);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  // Use centralized helper to deploy presale and transfer mocks as needed
  const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
  const { deployPresale } = getPresaleHelpers();
  const helpers = await deployPresale({ bhtAddr: await mockBHT.getAddress(), nftAddr: await mockNFT.getAddress(), referralAddr: await referral.getAddress(), projectWallet: await projectWallet.getAddress() });
  presale = helpers.presale;

  // Ensure NFTs are available in presale and basic config
  const ownerAddr = await owner.getAddress();
  const presaleAddr = await presale.getAddress();
  await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

  await presale.connect(owner).setOperationsWallet(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
  await presale.connect(owner).setSigner(await owner.getAddress());
  await mockBHT.mint(await buyer.getAddress(), ethers.parseEther("10"));
  await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("10"));
  });

  it("should allow purchaseWithBHT happy path and increment totals", async function () {
    await presale.connect(owner).startPresale();
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
  await mockPrice.waitForDeployment();
  // set initial price and updatedAt on the mock oracle
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());

    // prepare signature as existing tests do
    const nonce = 1;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });

  it("purchaseWithETH should revert on missing signature or invalid allowed id", async function () {
    // Ensure signer is explicitly set so _verifySignature reverts with E12 on invalid signature
    await presale.connect(owner).setSigner(await owner.getAddress());
    await presale.connect(owner).startPresale();
    // try ETH purchase with a signature that is correctly formed but NOT signed by the authorized signer
    const nonce = 2;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    // signature created by the buyer (not the configured signer) => _verifySignature should return false and revert with 'E12'
    const badSignature = await buyer.signMessage(ethers.getBytes(messageHash));
    await expect(presale.connect(buyer).purchaseWithETH(1, 1, nonce, badSignature, { value: ethers.parseEther('0.1') }))
      .to.be.revertedWith('E12');
  });
});
