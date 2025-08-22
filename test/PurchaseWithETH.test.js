const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PurchaseWithETH integration", function () {
  let owner, buyer, projectWallet;
  let mockBHT, mockNFT, referral, presale;

  beforeEach(async function () {
    [owner, buyer, projectWallet] = await ethers.getSigners();

    const MockBHT = await ethers.getContractFactory("MockBashoodToken");
    mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

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
      ethers.parseEther("0.01"),
      ethers.parseEther("0.02"),
      0,
      0,
      100
    );
    await presale.waitForDeployment();

    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});

    await presale.connect(owner).startPresale();
  });

  it("allows purchaseWithETH and transfers NFT and funds", async function () {
    const nonce = 2;
    const signature = await owner.signMessage(ethers.getBytes(ethers.keccak256(ethers.concat([ethers.toBeHex(await buyer.getAddress(), 32), ethers.toBeHex(nonce, 32)]))));

    // buyer purchases with ETH
    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther("0.01") });

    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });
});
