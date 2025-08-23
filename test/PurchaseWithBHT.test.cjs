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

    const Referral = await ethers.getContractFactory("BashoodReferral");
    referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

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

  // Transfer some NFTs from owner to presale so purchases can succeed
  const ownerAddr = await owner.getAddress();
  const presaleAddr = await presale.getAddress();
  await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther("10"));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("10"));
  });

  it("allows purchaseWithBHT when allowances and params correct (happy path)", async function () {
    await presale.connect(owner).startPresale();
  const MockPrice = await ethers.getContractFactory("MockPriceFeed");
  const mockPrice = await MockPrice.deploy(ethers.parseUnits("1", 18), 18);
    await mockPrice.waitForDeployment();
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("1"));
  const nonce = 1;
  const buyerAddr = await buyer.getAddress();
  // Match Solidity: keccak256(abi.encodePacked(address (20 bytes), uint256 (32 bytes)))
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
});

