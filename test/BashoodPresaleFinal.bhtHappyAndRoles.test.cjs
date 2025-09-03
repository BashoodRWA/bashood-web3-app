if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - BHT happy path and role checks", function () {
  let owner, buyer, projectWallet;

  async function deployAndSetup(customProjectWalletAddress) {
    const [o, b, p] = await ethers.getSigners();
    owner = o; buyer = b; projectWallet = p;

    const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    bht = await MockBHT.deploy();
    const mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

    const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    await mockNFT.mint(await owner.getAddress(), 1, 10);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    const referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  const Presale = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const projectAddr = customProjectWalletAddress || await projectWallet.getAddress();
    const args = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      projectAddr,
      ethers.parseEther("0.1"),
      ethers.parseEther("0.2"),
      0,
      0,
      100
    ];
    const tx = await Presale.getDeployTransaction(...args);
    const sent = await owner.sendTransaction({ data: tx.data });
    const receipt = await sent.wait();
    const presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);

    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress());

    // transfer some NFTs to presale
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 10, "0x");

    return { presale, mockBHT, mockNFT, referral, owner, buyer, projectAddr };
  }

  it("happy path BHT purchase updates totals and balances", async function () {
    const { presale, mockBHT, mockNFT, owner, buyer, projectAddr } = await deployAndSetup();

    // deploy and set a fresh price feed with price = 1
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits("1", 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve exact discounted cost
    // For 1 NFT: baseCost = nftPriceBHT = 0.2 BHT (as set in constructor args), discount bps = 0, burn bps = 0 => discountedCost = 0.2
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
    // approve the presale for at least discounted cost
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('1'));

    await presale.connect(owner).startPresale();

    const nonce = 77;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const buyerBalanceBefore = await mockBHT.balanceOf(buyerAddr);
    const opsBalanceBefore = await mockBHT.balanceOf(await owner.getAddress());

    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);

    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);

    const buyerBalanceAfter = await mockBHT.balanceOf(buyerAddr);
    const opsBalanceAfter = await mockBHT.balanceOf(await owner.getAddress());

    // discountedCost = 0.2 BHT; buyer balance should decrease by that amount
    expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(ethers.parseEther('0.2'));
    // ops wallet (owner) should receive opsAmount (since burnBps = 0, opsAmount == discountedCost)
    expect(opsBalanceAfter - opsBalanceBefore).to.equal(ethers.parseEther('0.2'));
  });

  it("reverts E22 when buyer is the signer", async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployAndSetup();
    // set signer to buyer
    await presale.connect(owner).setSigner(await buyer.getAddress());

    // set price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits("1", 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('10'));

    await presale.connect(owner).startPresale();

    const nonce = 88;
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
    ).to.be.revertedWith('E22');
  });

  it("reverts E23 when buyer is the deployer", async function () {
    const { presale, mockBHT, mockNFT, owner } = await deployAndSetup();
    // owner is deployer (constructor granted deployer = msg.sender)

    // price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits("1", 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve to owner (who will attempt to buy)
    await mockBHT.mint(await owner.getAddress(), ethers.parseEther('10'));
    await mockBHT.connect(owner).approve(await presale.getAddress(), ethers.parseEther('10'));

  // Ensure signer is NOT the owner so E22 doesn't short-circuit the check for E23
  // use the projectWallet signer (third account) as the authorized signer
  const signers = await ethers.getSigners();
  const projectSigner = signers[2];
  await presale.connect(owner).setSigner(await projectSigner.getAddress());
  await presale.connect(owner).startPresale();

    const nonce = 99;
    const ownerAddr = await owner.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(ownerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await expect(
      presale.connect(owner).purchaseWithBHT(1, 1, nonce, signature)
    ).to.be.revertedWith('E23');
  });

});
