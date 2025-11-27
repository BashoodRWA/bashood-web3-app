const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: BashoodReferral focused tests", function () {
  it("covers setPresaleContract owner and failure cases", async function () {
    const [owner, alice, bob] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
  const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Referral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress());
    await referral.waitForDeployment();

    // only owner can set
    await expect(referral.connect(alice).setPresaleContract(alice.address)).to.be.revertedWith("Only owner can set presale");

    // invalid zero address
    await expect(referral.connect(owner).setPresaleContract(ethers.ZeroAddress)).to.be.revertedWith("Invalid presale address");

    // valid set updates and emits event
    const tx = await referral.connect(owner).setPresaleContract(bob.address);
    const rcpt = await tx.wait();
    const ev = rcpt.logs.find(l => l.topics[0]);
    expect(await referral.presaleAddress()).to.equal(await bob.getAddress ? await bob.getAddress() : bob.address);
  });

  it("covers rewardReferrer happy path and revert branches", async function () {
    const [owner, presale, alice, bob, charlie] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
  const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Referral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    const referral = await Referral.deploy(presale.address, owner.address, await nft.getAddress());
    await referral.waitForDeployment();

    // successful reward: presale caller awards alice referred by bob
    await expect(referral.connect(presale).rewardReferrer(await alice.getAddress(), await bob.getAddress()))
      .to.emit(referral, 'ReferralRewarded')
      .withArgs(await alice.getAddress(), await bob.getAddress());

    expect(await referral.getReferrerOf(await alice.getAddress())).to.equal(await bob.getAddress());
    expect(await referral.getReferralCount(await bob.getAddress())).to.equal(1);

    // zero user
    await expect(referral.connect(presale).rewardReferrer(ethers.ZeroAddress, await bob.getAddress())).to.be.revertedWith("Invalid user address");
    // zero referrer
    await expect(referral.connect(presale).rewardReferrer(await charlie.getAddress(), ethers.ZeroAddress)).to.be.revertedWith("Invalid referrer address");
    // self refer
    await expect(referral.connect(presale).rewardReferrer(await bob.getAddress(), await bob.getAddress())).to.be.revertedWith("Cannot refer yourself");
    // already referred
    await expect(referral.connect(presale).rewardReferrer(await alice.getAddress(), await charlie.getAddress())).to.be.revertedWith("User already referred");
  });

  it("covers registerReferral branches and getters", async function () {
    const [owner, referrer, referred] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
  const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Referral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress());
    await referral.waitForDeployment();

    // zero referrer
    await expect(referral.connect(referred).registerReferral(ethers.ZeroAddress)).to.be.revertedWith("Invalid referrer address");
    // self refer
    await expect(referral.connect(referred).registerReferral(await referred.getAddress())).to.be.revertedWith("Cannot refer yourself");

    // successful register
    await expect(referral.connect(referred).registerReferral(await referrer.getAddress()))
      .to.emit(referral, 'ReferralRegistered')
      .withArgs(await referred.getAddress(), await referrer.getAddress());

    // cannot register twice
    await expect(referral.connect(referred).registerReferral(await referrer.getAddress())).to.be.revertedWith("Already referred");

    expect(await referral.getReferrerOf(await referred.getAddress())).to.equal(await referrer.getAddress());
    expect(await referral.getReferralCount(await referrer.getAddress())).to.equal(1);
  });

  it("covers claimNFT success and failure paths", async function () {
    const [owner, ref1, ref2, ref3, referrer] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
  const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Referral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    const referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress());
    await referral.waitForDeployment();

    // not enough referrals -> revert
    await expect(referral.connect(referrer).claimNFT()).to.be.revertedWith("Not enough referrals to claim");

    // increase referral count by having three different accounts register referrer
    await referral.connect(ref1).registerReferral(await referrer.getAddress());
    await referral.connect(ref2).registerReferral(await referrer.getAddress());
    await referral.connect(ref3).registerReferral(await referrer.getAddress());

    expect(await referral.getReferralCount(await referrer.getAddress())).to.equal(3);

    // successful claim
    await expect(referral.connect(referrer).claimNFT()).to.emit(referral, 'NFTClaimed').withArgs(await referrer.getAddress());

    // NFT minted to referrer
    const bal = await nft.balanceOf(await referrer.getAddress(), 1);
    expect(bal).to.equal(1);

    // cannot claim twice
    await expect(referral.connect(referrer).claimNFT()).to.be.revertedWith("Ya reclamaste tu NFT");
  });
});







