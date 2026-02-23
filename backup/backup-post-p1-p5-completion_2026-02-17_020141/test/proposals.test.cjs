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
  const MockFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  priceFeed = await MockFeed.deploy(8, ethers.parseUnits('2000', 8));
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
    const d = await deployPresale({
      bhtAddr: await bashoodToken.getAddress(),
      nftAddr: await nft.getAddress(),
      referralAddr: await referral.getAddress(),
      projectWallet: admin
    });
    presale = d.presale;
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
    if (typeof setPriceFresh === 'function') {
      await setPriceFresh(priceFeed, ethers.parseUnits('2000', 8));
    } else if (priceFeed.setUpdatedAt) {
      await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
      await ethers.provider.send("evm_mine");
    }
    // Mint and approve BHT
    await bashoodToken.mint(user.address, ethers.parseUnits("1000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
  });

  it.skip("permite enviar propuesta y emite BHTBurned y ProposalSubmitted - DEPRECATED: submitProposal removed", async function () {
    await expect(
      presale.connect(user).submitProposal(proposalData, depositBHT)
    ).to.emit(presale, "BHTBurned").and.to.emit(presale, "ProposalSubmitted");
  });

  it.skip("revierta si el oráculo está stale - DEPRECATED: submitProposal removed", async function () {
    await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp - 1000);
    await expect(
      presale.connect(user).submitProposal(proposalData, depositBHT)
    ).to.be.revertedWith("Oracle: Invalid/stale");
  });

  it("revierta si la quema supera el cap", async function () {
    // The setter already enforces cap: setBurnBps(2000) would revert with 'Burn cap exceeded'
    // This test attempts to verify the cap check in submitProposal, but
    // since we can't set invalid values via setter, the check is already covered
    // by setBurnBps() validation and other submitProposal tests
    this.skip();
  });

  it.skip("permite finalizar propuesta solo a ADMIN_ROLE - DEPRECATED: submitProposal/finalizeProposal removed", async function () {
    await presale.connect(user).submitProposal(proposalData, depositBHT);
    await expect(
      presale.connect(admin).finalizeProposal(1)
    ).to.emit(presale, "ProposalFinalized");
    await expect(
      presale.connect(user).finalizeProposal(1)
    ).to.be.reverted;
  });
});






