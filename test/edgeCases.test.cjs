if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodPresaleFinal - Edge Cases", function () {
  let deployer, user, admin, BashoodToken, bashoodToken, BashoodPresaleFinal, presale, priceFeed;

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
  BashoodToken = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();
  // Use constructor-based MockPriceFeed for this test file (supports setAnswer and setUpdatedAt)
  const MockFeed = await ethers.getContractFactory("contracts/MockPriceFeed.sol:MockPriceFeed");
  priceFeed = await MockFeed.deploy(2000, 8);
    await priceFeed.waitForDeployment();
    const Validator = await ethers.getContractFactory("ReferralValidator");
    const validator = await Validator.deploy(deployer.address);
    await validator.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory("contracts/BashoodReferral.sol:BashoodReferral");
    const referral = await BashoodReferral.deploy(
      await deployer.getAddress(),
      await validator.getAddress(),
      await nft.getAddress()
    );
    await referral.waitForDeployment();
  BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const deployArgs = [
      await bashoodToken.getAddress(),
      await nft.getAddress(),
      await referral.getAddress(),
      await admin.getAddress(),
      BigInt(0),
      BigInt(0),
      BigInt(1), // presaleStart (use now-ish non-zero)
      BigInt(10000000000), // presaleEnd (far future)
      BigInt(100)
    ];
    console.log('deployArgs length:', deployArgs.length);
    console.log('ctor input count:', BashoodPresaleFinal.interface.deploy.inputs.length);
    try {
      // Sanity-check deploy transaction to catch bad argument shapes early
      const txData = await BashoodPresaleFinal.getDeployTransaction(...deployArgs);
      console.log('getDeployTransaction succeeded, tx data length:', txData.data ? txData.data.length : 0);
  const unsigned = await BashoodPresaleFinal.getDeployTransaction(...deployArgs);
  if (!unsigned || !unsigned.data) throw new Error('missing presale deploy data');
  const sent = await deployer.sendTransaction({ data: unsigned.data });
      const receipt = await sent.wait();
      presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);
    } catch (err) {
      console.error('Deploy failed. deployArgs:', deployArgs.map(a => (a && a.toString ? a.toString() : String(a))));
      console.error('Ctor inputs:', BashoodPresaleFinal.interface.deploy.inputs);
      throw err;
    }
  await presale.connect(deployer).grantRole(await presale.ADMIN_ROLE(), await deployer.getAddress());
  await presale.connect(deployer).setSigner(await deployer.getAddress());
  await presale.connect(deployer).setOperationsWallet(await admin.getAddress());
  if (presale.setPriceFeed) await presale.connect(deployer).setPriceFeed(await priceFeed.getAddress());
    await presale.connect(deployer).setBurnBps(500);
    if (presale.setMaxPriceStaleness) await presale.connect(deployer).setMaxPriceStaleness(120);
    const presaleStart = await presale.presaleStart();
    let blockBefore = await ethers.provider.getBlock("latest");
    let nextTimestamp = Math.max(Number(presaleStart) + 1, blockBefore.timestamp + 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await ethers.provider.send("evm_mine");
    await presale.connect(deployer).startPresale();
  // setUpdatedAt exists on constructor-variant mock
  await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
  await ethers.provider.send("evm_mine");
  await bashoodToken.mint(user.address, ethers.parseUnits("1000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("revierta si el usuario no tiene suficiente BHT", async function () {
    await bashoodToken.connect(user).approve(await presale.getAddress(), 0);
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, ethers.parseUnits("100", 18))
    ).to.be.reverted;
  });

  it("revierta si el oráculo devuelve precio cero", async function () {
    await priceFeed.setAnswer(0);
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, ethers.parseUnits("10", 18))
    ).to.be.revertedWith("Invalid price");
  });

  it("revierta si se intenta finalizar una propuesta inexistente", async function () {
    await expect(
      presale.connect(admin).finalizeProposal(999)
    ).to.be.reverted;
  });

  it("revierta si un usuario intenta pagar con cantidad cero", async function () {
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](1, 0)
    ).to.be.reverted;
  });
});
