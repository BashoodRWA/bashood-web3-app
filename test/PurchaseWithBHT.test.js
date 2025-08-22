const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PurchaseWithBHT integration", function () {
  let owner, buyer, referrer, projectWallet;
  let mockBHT, mockERC20, mockNFT, referral, presale;

  beforeEach(async function () {
    [owner, buyer, referrer, projectWallet] = await ethers.getSigners();

    const MockBHT = await ethers.getContractFactory("MockBashoodToken");
    mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy();
    await mockERC20.waitForDeployment();

    const MockNFT = await ethers.getContractFactory("MockNFT1155");
    mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    await mockNFT.mintTo(await owner.getAddress(), 1, 10);

    // Deploy a simple Referral contract
    const Referral = await ethers.getContractFactory("BashoodReferral");
    referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

    // Deploy presale
    const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
    presale = await Presale.deploy(
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await projectWallet.getAddress(),
      ethers.parseEther("0.1"),
      ethers.parseEther("0.2"),
      0,
      0,
      100
    );
    await presale.waitForDeployment();

    // Configure presale
    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});
    // set a fake priceFeed by deploying a small mock aggregator if needed; tests use _calculateBhtAmounts indirectly via allowances

    // Grant admin role to owner
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    // set signer so signature verification works (we'll bypass signature by using 0 signature scenario in these simple tests)
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});

    // Approve presale to move buyer tokens and mint buyer some BHT
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther("10"));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("10"));
  });

  it("allows purchaseWithBHT when allowances and params correct (happy path)", async function () {
    // allow the nft id and set presale active by toggling flag via admin
    await presale.connect(owner).startPresale();

    // Mark nft id 1 as allowed via constructor default

    // Provide fake price feed: we will mock priceFeed behavior by deploying a small contract
    const MockPrice = await ethers.getContractFactory("MockPriceFeed");
    const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());

    // Give buyer allowance and attempt purchase
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("1"));

    // Build a dummy signature where signer==owner (presale.setSigner above)
    const nonce = 1;
    const signingKey = await owner.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.toBeHex(await buyer.getAddress(), 32), ethers.toBeHex(nonce, 32)]));
    // Instead of building a real ECDSA signature here, the contract only compares ECDSA.recover to signerAddress; we set signerAddress to owner so we can craft signature using owner private key via ethers signer
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);

    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });
});
