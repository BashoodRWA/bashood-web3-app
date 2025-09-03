if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - BHT edge cases", function () {
  let owner, buyer, projectWallet;

  async function setup() {
    const [o, b, p] = await ethers.getSigners();
    owner = o; buyer = b; projectWallet = p;

    const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
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
    const args = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await projectWallet.getAddress(),
      ethers.parseEther("0.1"),
      ethers.parseEther("0.2"),
      0,
      0,
      100
    ];
    const tx = await Presale.getDeployTransaction(...args);
    const sent = await owner.sendTransaction({ data: tx.data });
    const receipt = await sent.wait();
    const presaleAddr = receipt.contractAddress;
    const presale = await ethers.getContractAt('BashoodPresaleFinal', presaleAddr);

    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress());

    // Transfer some NFTs
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 10, "0x");

    return { presale, mockBHT, mockNFT, referral };
  }

  it("reverts E30 when allowance is insufficient (BHT)", async function () {
  const { presale, mockBHT } = await setup();
  // Configure a price feed so _calculateBhtAmounts doesn't revert earlier
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy();
  await mockPrice.waitForDeployment();
  await mockPrice.setPrice(ethers.parseUnits("1", 18), Math.floor(Date.now() / 1000));
  await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

  // mint BHT to buyer but DO NOT approve -> allowance is zero -> should revert E30
  await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
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

    // Deploy a price feed and set an old timestamp
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    // set price updatedAt to far in past
    await mockPrice.setPrice(ethers.parseUnits("1", 18), 1);
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve BHT to buyer
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('10'));

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
    // deploy a rejecting wallet and pass it as projectWallet to presale
    const [ownerLocal, buyerLocal] = await ethers.getSigners();
    const Rejecting = await ethers.getContractFactory('contracts/mocks/RejectingWallet.sol:RejectingWallet');
    const rejecting = await Rejecting.deploy();
    await rejecting.waitForDeployment();

    // re-deploy presale with rejecting wallet as project wallet
    const MockBHT = await ethers.getContractFactory("contracts/mocks/MockBashoodToken.sol:MockBashoodToken");
    const mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

    const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    await mockNFT.mint(await ownerLocal.getAddress(), 1, 10);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    const referral = await Referral.deploy(await ownerLocal.getAddress(), await ownerLocal.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  const Presale = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const args = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await rejecting.getAddress(),
      ethers.parseEther("0.1"),
      ethers.parseEther("0.2"),
      0,
      0,
      100
    ];
    const tx = await Presale.getDeployTransaction(...args);
    const sent = await ownerLocal.sendTransaction({ data: tx.data });
    const receipt = await sent.wait();
    const presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);

    await presale.connect(ownerLocal).setOperationsWallet(await ownerLocal.getAddress());
    await presale.connect(ownerLocal).setMaxPriceStaleness(1000);
    await presale.connect(ownerLocal).grantRole(await presale.ADMIN_ROLE(), await ownerLocal.getAddress());
    await presale.connect(ownerLocal).setSigner(await ownerLocal.getAddress());

    // Transfer NFTs and start presale
    await mockNFT.connect(ownerLocal).safeTransferFrom(await ownerLocal.getAddress(), await presale.getAddress(), 1, 1, "0x");
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

    await expect(
      presale.connect(buyerLocal).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('ETH transfer failed');
  });

});
