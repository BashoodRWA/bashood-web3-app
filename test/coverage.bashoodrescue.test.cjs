const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage: BashoodRescue focused tests", function () {
  it("constructor rejects zero addresses and grants roles", async function () {
    const [admin, emergency] = await ethers.getSigners();
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    await expect(Rescue.deploy(ethers.ZeroAddress, emergency.address)).to.be.revertedWith("Rescue: invalid admin");
    await expect(Rescue.deploy(admin.address, ethers.ZeroAddress)).to.be.revertedWith("Rescue: invalid emergency");

    const rescue = await Rescue.deploy(admin.address, emergency.address);
    await rescue.waitForDeployment();
    expect(await rescue.hasRole(await rescue.ADMIN_ROLE(), await admin.getAddress())).to.equal(true);
  });

  it("authorize/revoke caller and rescueUnsoldNFTs happy and revert paths", async function () {
    const [admin, emergency, alice] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
    const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(admin.address, emergency.address);
    await rescue.waitForDeployment();

  // mint NFT to rescue first so we hit the authorization check (not insufficient balance)
  await nft.mintTo(await rescue.getAddress ? await rescue.getAddress() : rescue.address, 1, 2);

  // sanity checks: alice should not be authorized nor have ADMIN role
  expect(await rescue.authorizedCallers(await alice.getAddress())).to.equal(false);
  expect(await rescue.hasRole(await rescue.ADMIN_ROLE(), await alice.getAddress())).to.equal(false);

  // still not authorized initially (call from non-admin alice)
  // diagnostic: attempt call and log outcome
  let aliceReverted = false;
  try {
    const tx = await rescue.connect(alice).rescueUnsoldNFTs(await nft.getAddress(), 1, await alice.getAddress(), 1);
    await tx.wait();
    console.log('DEBUG: alice call succeeded unexpectedly');
  } catch (err) {
    aliceReverted = true;
    console.log('DEBUG: alice call reverted as expected', err && err.message ? err.message : err);
  }
  expect(aliceReverted).to.equal(true);
    // authorize alice (non-admin) and ensure she can rescue
    await rescue.connect(admin).authorizeCaller(await alice.getAddress());
    expect(await rescue.authorizedCallers(await alice.getAddress())).to.equal(true);

    // rescue should succeed when called by authorized caller (alice)
    await expect(rescue.connect(alice).rescueUnsoldNFTs(await nft.getAddress(), 1, await alice.getAddress(), 1))
      .to.emit(rescue, 'ERC1155Rescued')
      .withArgs(await nft.getAddress(), 1, await alice.getAddress(), 1);

    // revoke alice and then alice call should revert due to not authorized
    await rescue.connect(admin).revokeCaller(await alice.getAddress());
    await expect(rescue.connect(alice).rescueUnsoldNFTs(await nft.getAddress(), 1, await alice.getAddress(), 1)).to.be.reverted;
  });

  it("rescueERC20 happy and error flows", async function () {
    const [admin, emergency, alice] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(admin.address, emergency.address);
    await rescue.waitForDeployment();

    // mint tokens to rescue
    await token.mint(await rescue.getAddress ? await rescue.getAddress() : rescue.address, 1000);

  // unauthorized call (from alice) should revert
  await expect(rescue.connect(alice).rescueERC20(await token.getAddress(), await alice.getAddress(), 1)).to.be.revertedWith("Rescue: not authorized");

  // authorize admin and rescue
  await rescue.connect(admin).authorizeCaller(admin.address);
    await expect(rescue.connect(admin).rescueERC20(await token.getAddress(), await alice.getAddress(), 500))
      .to.emit(rescue, 'ERC20Rescued')
      .withArgs(await token.getAddress(), await alice.getAddress(), 500);

    // insufficient balance path
    await expect(rescue.connect(admin).rescueERC20(await token.getAddress(), await alice.getAddress(), 1000000)).to.be.revertedWith("Rescue: insufficient token balance");
  });

  it("emergencyWithdrawETH covers role and error branches", async function () {
    const [admin, emergency, alice] = await ethers.getSigners();
    const Rescue = await ethers.getContractFactory("BashoodRescue");
    const rescue = await Rescue.deploy(admin.address, emergency.address);
    await rescue.waitForDeployment();

    // sending ETH to rescue
    await alice.sendTransaction({ to: await rescue.getAddress ? await rescue.getAddress() : rescue.address, value: ethers.parseEther("0.1") });

    // only emergency role can call
  await expect(rescue.connect(admin).emergencyWithdrawETH()).to.be.reverted;

    // invalid wallet zero address
  await expect(rescue.connect(emergency).emergencyWithdrawETH()).to.be.revertedWith("Rescue: invalid wallet");

    // successful withdraw
  await expect(rescue.connect(emergency).emergencyWithdrawETH())
      .to.emit(rescue, 'EmergencyEthWithdrawn');

    // now contract has no ETH
  await expect(rescue.connect(emergency).emergencyWithdrawETH()).to.be.revertedWith("Rescue: no ETH");
  });
});
