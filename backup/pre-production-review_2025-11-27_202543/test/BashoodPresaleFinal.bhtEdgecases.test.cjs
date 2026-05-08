if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - BHT edge cases", function () {
  let owner, buyer, projectWallet;

  async function setup(opts = {}) {
    // use shared test helper to deploy presale and mocks reliably
    const helpers = getPresaleHelpers();
    const d = await helpers.deployPresale(opts);
    owner = d.owner; buyer = d.buyer; projectWallet = d.projectWallet;
    // helpers returns presale, bht, nft, referral
    return { presale: d.presale, mockBHT: d.bht, mockNFT: d.nft, referral: d.referral };
  }

  it("reverts E30 when allowance is insufficient (BHT)", async function () {
  const { presale, mockBHT, mockNFT } = await setup();
  // Configure a price feed so _calculateBhtAmounts doesn't revert earlier
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
  await mockPrice.waitForDeployment();
  // use shared helper to set both price and updatedAt
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
  await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
  // ensure signer is set so signature checks use the expected signer (avoids E31)
  await presale.connect(owner).setSigner(await owner.getAddress());

  // mint BHT to buyer but DO NOT approve -> allowance is zero -> should revert E30
  await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
  // ensure presale has NFT stock and pricing config so BHT path reaches allowance check
  await mockNFT.mint(await owner.getAddress(), 1, 1);
  await mockNFT.safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');
  await presale.connect(owner).setOperationsWallet(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  await presale.connect(owner).startPresale();

    const nonce = 10;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature)
    ).to.be.revertedWith('E30');
  });

  it("reverts when price oracle is stale (BHT)", async function () {
    const { presale, mockBHT, mockNFT } = await setup();
    await presale.connect(owner).startPresale();

    // Deploy a price feed (mocks implementation exposes setAnswerWithTimestamp)
    const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await mockPrice.waitForDeployment();
    // set price updatedAt to far in past via setAnswerWithTimestamp
    await mockPrice.setAnswerWithTimestamp(ethers.parseUnits('1', 8), 1);
  await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
  // ensure signer is set so price staleness is checked after signature verification
  await presale.connect(owner).setSigner(await owner.getAddress());
  await presale.connect(owner).setOperationsWallet(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);

    // mint and approve BHT to buyer
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('10'));

    // ensure presale holds an NFT so price staleness check is reached (avoid E28)
    await mockNFT.connect(owner).mint(await owner.getAddress(), 1, 1);
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');

    const nonce = 11;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature)
    ).to.be.revertedWith('Price too stale');
  });

  it("reverts ETH purchase when project wallet rejects ETH transfer", async function () {
    // deploy a rejecting wallet and pass it as projectWallet to presale via helper
    const Rejecting = await ethers.getContractFactory('contracts/mocks/RejectingWallet.sol:RejectingWallet');
    const rejecting = await Rejecting.deploy();
    await rejecting.waitForDeployment();

    // Use helper to deploy presale with rejecting wallet address as projectWallet
    const { presale } = await setup({ projectWallet: await rejecting.getAddress() });
    // set basic presale params
    const signers = await ethers.getSigners();
    const ownerLocal = signers[0];
    const buyerLocal = signers[2];

    await presale.connect(ownerLocal).setOperationsWallet(await ownerLocal.getAddress());
    await presale.connect(ownerLocal).setMaxPriceStaleness(1000);
    await presale.connect(ownerLocal).grantRole(await presale.ADMIN_ROLE(), await ownerLocal.getAddress());
    await presale.connect(ownerLocal).setSigner(await ownerLocal.getAddress());

    // Transfer NFTs and start presale
    // presale helper already minted and transferred some NFTs; ensure started
    await presale.connect(ownerLocal).startPresale();

    const nonce = 50;
    const buyerAddr = await buyerLocal.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await ownerLocal.signMessage(ethers.getBytes(messageHash));

    const nftPrice = await presale.nftPriceETH();
    await expect(
      presale.connect(buyerLocal).purchaseWithETH(1, 1, nonce, signature, { value: nftPrice })
    ).to.be.revertedWith('E16');
  });

});








