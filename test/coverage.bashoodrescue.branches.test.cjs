const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: BashoodRescue branch tests", function () {
  let rescue, nft, token, owner, emergency, alice;

  beforeEach(async function () {
    [owner, emergency, alice] = await ethers.getSigners();
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    rescue = await Rescue.deploy(owner.address, emergency.address);
    await rescue.waitForDeployment();

    const NFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Token = await ethers.getContractFactory("BashoodToken");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();
  });

  // --- Constructor revert branches (L48, L49, L50) ---
  it("constructor reverts with zero admin", async function () {
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    await expect(Rescue.deploy(ethers.ZeroAddress, emergency.address))
      .to.be.revertedWith("Rescue: invalid admin");
  });

  it("constructor reverts with zero emergency", async function () {
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    await expect(Rescue.deploy(owner.address, ethers.ZeroAddress))
      .to.be.revertedWith("Rescue: invalid emergency");
  });

  // --- setProjectWallet branches (L62-68) ---
  it("setProjectWallet reverts with zero address", async function () {
    await expect(rescue.setProjectWallet(ethers.ZeroAddress))
      .to.be.revertedWith("Rescue: invalid wallet");
  });

  it("setProjectWallet reverts when already set", async function () {
    await rescue.setProjectWallet(alice.address);
    await expect(rescue.setProjectWallet(owner.address))
      .to.be.revertedWith("Rescue: wallet already set");
  });

  it("setProjectWallet reverts for non-admin", async function () {
    await expect(rescue.connect(alice).setProjectWallet(alice.address))
      .to.be.reverted;
  });

  // --- rescueUnsoldNFTs branches (L80-83) ---
  it("rescueUnsoldNFTs reverts for non-authorized caller", async function () {
    await expect(rescue.connect(alice).rescueUnsoldNFTs(
      await nft.getAddress(), 1, owner.address, 1
    )).to.be.revertedWith("Rescue: not authorized");
  });

  it("rescueUnsoldNFTs reverts with zero nftContract", async function () {
    await expect(rescue.rescueUnsoldNFTs(
      ethers.ZeroAddress, 1, owner.address, 1
    )).to.be.revertedWith("Rescue: invalid nft");
  });

  it("rescueUnsoldNFTs reverts with zero to address", async function () {
    await expect(rescue.rescueUnsoldNFTs(
      await nft.getAddress(), 1, ethers.ZeroAddress, 1
    )).to.be.revertedWith("Rescue: invalid to");
  });

  it("rescueUnsoldNFTs reverts with zero amount", async function () {
    await expect(rescue.rescueUnsoldNFTs(
      await nft.getAddress(), 1, owner.address, 0
    )).to.be.revertedWith("Rescue: zero amount");
  });

  // --- rescueERC20 branches (L96) ---
  it("rescueERC20 reverts for non-authorized caller", async function () {
    await expect(rescue.connect(alice).rescueERC20(
      await token.getAddress(), owner.address, 1
    )).to.be.revertedWith("Rescue: not authorized");
  });

  it("rescueERC20 reverts with zero token address", async function () {
    await expect(rescue.rescueERC20(
      ethers.ZeroAddress, owner.address, 1
    )).to.be.revertedWith("Rescue: invalid token");
  });

  it("rescueERC20 reverts with zero to address", async function () {
    await expect(rescue.rescueERC20(
      await token.getAddress(), ethers.ZeroAddress, 1
    )).to.be.revertedWith("Rescue: invalid to");
  });

  it("rescueERC20 reverts with zero amount", async function () {
    await expect(rescue.rescueERC20(
      await token.getAddress(), owner.address, 0
    )).to.be.revertedWith("Rescue: zero amount");
  });

  // --- emergencyWithdrawETH branches (L121-122) ---
  it("emergencyWithdrawETH reverts when project wallet not set", async function () {
    await expect(rescue.connect(emergency).emergencyWithdrawETH())
      .to.be.revertedWith("Rescue: invalid wallet");
  });

  it("emergencyWithdrawETH reverts when no ETH balance", async function () {
    await rescue.setProjectWallet(alice.address);
    await expect(rescue.connect(emergency).emergencyWithdrawETH())
      .to.be.revertedWith("Rescue: no ETH");
  });

  // --- claimEmergencyWithdrawal branches (L128-129) ---
  it("claimEmergencyWithdrawal reverts when no pending amount", async function () {
    await expect(rescue.connect(alice).claimEmergencyWithdrawal())
      .to.be.revertedWith("Rescue: no pending withdrawal");
  });

  // --- authorizeCaller branch ---
  it("authorizeCaller reverts with zero address", async function () {
    await expect(rescue.authorizeCaller(ethers.ZeroAddress))
      .to.be.revertedWith("Rescue: zero caller");
  });

  // --- revokeCaller branch ---
  it("revokeCaller reverts when caller not authorized", async function () {
    await expect(rescue.revokeCaller(alice.address))
      .to.be.revertedWith("Rescue: not authorized");
  });

  // --- supportsInterface branches (L162) ---
  it("supportsInterface returns true for IERC1155Receiver", async function () {
    // IERC1155Receiver interfaceId = 0x4e2312e0
    expect(await rescue.supportsInterface("0x4e2312e0")).to.equal(true);
  });

  it("supportsInterface returns false for random interfaceId", async function () {
    expect(await rescue.supportsInterface("0xdeadbeef")).to.equal(false);
  });

  it("supportsInterface returns true for AccessControl", async function () {
    // IAccessControl interfaceId = 0x7965db0b
    expect(await rescue.supportsInterface("0x7965db0b")).to.equal(true);
  });
});
