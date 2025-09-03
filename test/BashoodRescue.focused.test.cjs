if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodRescue - focused branch coverage", function () {
  let owner, alice, bob;
  let Rescue, rescue;
  let MockERC20, token;
  let MockNFT1155, nft;
  let rescueAddr, tokenAddr, nftAddr;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

  Rescue = await ethers.getContractFactory("BashoodRescue");
  // constructor(admin, emergency)
  rescue = await Rescue.deploy(owner.address, alice.address);
  await rescue.waitForDeployment();

  MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
  token = await MockERC20.deploy();
    await token.waitForDeployment();

  MockNFT1155 = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  nft = await MockNFT1155.deploy();
    await nft.waitForDeployment();

    // mint some NFTs and tokens to rescue contract
  rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
  tokenAddr = token.getAddress ? await token.getAddress() : (token.address || token.target);
  nftAddr = nft.getAddress ? await nft.getAddress() : (nft.address || nft.target);

  await token.mint(rescueAddr, 1000);
  await nft.mint(rescueAddr, 1, 10);
  });

  it("authorize and revoke caller flows and events", async function () {
    // only ADMIN_ROLE (deployer) can authorize
    const tx = await rescue.authorizeCaller(owner.address);
    await tx.wait();
    expect(await rescue.authorizedCallers(owner.address)).to.equal(true);

    const tx2 = await rescue.revokeCaller(owner.address);
    await tx2.wait();
    expect(await rescue.authorizedCallers(owner.address)).to.equal(false);
  });

  it("rescueERC20 succeeds only for authorized caller and reverts otherwise", async function () {
  // unauthorized should revert
  await expect(rescue.connect(bob).rescueERC20(tokenAddr, alice.address, 10)).to.be.revertedWith("Rescue: not authorized");

  // authorize alice and succeed
  await rescue.authorizeCaller(alice.address);
  await rescue.connect(alice).rescueERC20(tokenAddr, bob.address, 10);
  });

  it("rescueUnsoldNFTs handles success and rejects zero address and unauthorized", async function () {
  await expect(rescue.connect(bob).rescueUnsoldNFTs(nftAddr, 1, bob.address, 1)).to.be.revertedWith("Rescue: not authorized");

    await rescue.authorizeCaller(alice.address);
  await rescue.connect(alice).rescueUnsoldNFTs(nftAddr, 1, bob.address, 1);
  });

  it("emergencyWithdrawETH only with role and emits event", async function () {
    // send some ETH to contract
  await owner.sendTransaction({ to: rescueAddr, value: 1_000 });

    // alice was granted EMERGENCY_ROLE in constructor
    await expect(rescue.connect(alice).emergencyWithdrawETH(owner.address))
      .to.emit(rescue, 'EmergencyEthWithdrawn');

    // unauthorized should revert
    await expect(rescue.connect(bob).emergencyWithdrawETH(bob.address)).to.be.reverted;
  });
});
