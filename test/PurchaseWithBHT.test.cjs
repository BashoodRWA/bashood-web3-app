if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("PurchaseWithBHT integration", function () {
  let owner, buyer, referrer, projectWallet;
  let mockBHT, mockERC20, mockNFT, referral, presale;

  beforeEach(async function () {
    [owner, buyer, referrer, projectWallet] = await ethers.getSigners();

  const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

  const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
  mockERC20 = await MockERC20.deploy();
    await mockERC20.waitForDeployment();

  const MockNFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
    mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    // Support both mock variants: some mocks expose mintTo(addr,id,amt), others mint(addr,id,amt)
    try {
      await mockNFT.mintTo(await owner.getAddress(), 1, 10);
    } catch (e) {
      await mockNFT.mint(await owner.getAddress(), 1, 10);
    }

    const Referral = await ethers.getContractFactory("BashoodReferral");
    referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  // use shared helper to deploy presale and mocks reliably
  const helpers = getPresaleHelpers();
  const d = await helpers.deployPresale();
  presale = d.presale;
  mockBHT = d.bht;
  mockNFT = d.nft;
  referral = d.referral;

  // Transfer some NFTs from owner to presale so purchases can succeed (defensivo)
  const ownerAddr = await owner.getAddress();
  const presaleAddr = await presale.getAddress();
  try {
    await mockNFT.mintTo(ownerAddr, 1, 10);
  } catch (e) {
    try { await mockNFT.mint(ownerAddr, 1, 10); } catch (e2) { /* ignore if already minted */ }
  }
  try { await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x"); } catch (e) { /* ignore if already transferred */ }

    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});
  // Ensure buyer has lots of BHT and has approved the presale (defensivo)
  await mockBHT.mint(await buyer.getAddress(), ethers.parseUnits('1000000', 18));
  await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits('1000000000', 18));
  // set signer so signature checks use owner
  await presale.connect(owner).setSigner(await owner.getAddress());
  });

  it("allows purchaseWithBHT when allowances and params correct (happy path)", async function () {
    await presale.connect(owner).startPresale();
  // ensure presale holds NFTs (some helpers mint to owner only) — defensivo
  const presaleAddr = await presale.getAddress();
  try { await mockNFT.mintTo(presaleAddr, 1, 10); } catch (e) { try { await mockNFT.mint(presaleAddr, 1, 10); } catch (e2) { /* ignore */ } }
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await mockPrice.waitForDeployment();
  const blk = await ethers.provider.getBlock('latest');
  const nowTs = blk.timestamp || Math.floor(Date.now() / 1000);
  // set both price and updatedAt via shared helper
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
  await ethers.provider.send('evm_mine');
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
  await ethers.provider.send('evm_mine');
  // Ensure generous approval for the presale token to avoid allowance-related flakiness
  await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("1000000000"));
  const nonce = 1;
  const buyerAddr = await buyer.getAddress();
  // Match Solidity: keccak256(abi.encodePacked(address (20 bytes), uint256 (32 bytes)))
  // Normalize hashing/signing to ethers v6 helpers: solidityPackedKeccak256 + signMessage(getBytes(hash))
  const messageHash = ethers.solidityPackedKeccak256([
    'address', 'uint256'
  ], [buyerAddr, nonce]);
  const signature = await owner.signMessage(ethers.getBytes(messageHash));
  // ensure buyer has BHT and approved presale (again, defensivo)
  await mockBHT.mint(await buyer.getAddress(), ethers.parseUnits('1000', 18));
  await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits('1000000', 18));
  await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });
});







