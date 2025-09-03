if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - Proposals", function () {
  let deployer, user, admin, priceFeed, BashoodToken, bashoodToken, BashoodPresaleFinal, presale;
  const proposalData = ethers.hexlify(ethers.toUtf8Bytes("test proposal"));
  const depositBHT = ethers.parseUnits("50", 18);

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
  BashoodToken = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await MockNFT.deploy();
    await nft.waitForDeployment();
    // Mock price feed (constructor-variant used because we call setUpdatedAt/setAnswer)
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
  BigInt(1),
  BigInt(10000000000),
  BigInt(100)
    ];
    try {
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
    // Configure and start presale
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
    if (priceFeed.setUpdatedAt) {
      await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
      await ethers.provider.send("evm_mine");
    }
    // Mint and approve BHT
    await bashoodToken.mint(user.address, ethers.parseUnits("1000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("permite enviar propuesta y emite BHTBurned y ProposalSubmitted", async function () {
    await expect(
      presale.connect(user).submitProposal(proposalData, depositBHT)
    ).to.emit(presale, "BHTBurned").and.to.emit(presale, "ProposalSubmitted");
  });

  it("revierta si el oráculo está stale", async function () {
    await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp - 1000);
    await expect(
      presale.connect(user).submitProposal(proposalData, depositBHT)
    ).to.be.revertedWith("Price too stale");
  });

  it("revierta si la quema supera el cap", async function () {
    await presale.connect(deployer).setBurnBps(2000); // >15%
    await expect(
      presale.connect(user).submitProposal(proposalData, depositBHT)
    ).to.be.revertedWith("Burn cap");
  });

  it("permite finalizar propuesta solo a ADMIN_ROLE", async function () {
    await presale.connect(user).submitProposal(proposalData, depositBHT);
    await expect(
      presale.connect(admin).finalizeProposal(1)
    ).to.emit(presale, "ProposalFinalized");
    await expect(
      presale.connect(user).finalizeProposal(1)
    ).to.be.reverted;
  });
});
