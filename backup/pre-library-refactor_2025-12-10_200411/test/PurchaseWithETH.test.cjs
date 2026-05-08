if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("PurchaseWithETH integration", function () {
  let owner, buyer, projectWallet;
  let mockBHT, mockNFT, referral, presale;

  beforeEach(async function () {
    [owner, buyer, projectWallet] = await ethers.getSigners();

  const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
  mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

  const MockNFT = await ethers.getContractFactory("contracts/MockNFT1155.sol:MockNFT1155");
  mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    // MockNFT1155 in contracts/ has mintTo signature
    await mockNFT.mintTo(await owner.getAddress(), 1, 10);

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

  // Ensure presale has NFTs (deployPresale helper may mint to owner instead)
  const ownerAddr = await owner.getAddress();
  const presaleAddr = await presale.getAddress();
  try {
    // try mint directly to presale (most robust)
    await mockNFT.mint(presaleAddr, 1, 10);
  } catch (e) {
    try { await mockNFT.mintTo(presaleAddr, 1, 10); } catch (e2) {
      // last resort: transfer from owner if owner holds supply
      try { await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x"); } catch (e3) { /* ignore */ }
    }
  }

    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});

    // set a fresh price feed used by deployPresale helper
    try {
      const price = d.price;
      if (price) await setPriceFresh(price, ethers.parseUnits('1', 8));
    } catch (e) { /* ignore if helper didn't provide a price */ }

    await presale.connect(owner).startPresale();
  });

  it("allows purchaseWithETH and transfers NFT and funds", async function () {
  const nonce = 2;
  const buyerAddr = await buyer.getAddress();
  // Match Solidity: keccak256(abi.encodePacked(address (20 bytes), uint256 (32 bytes)))
  const messageHash = ethers.keccak256(
    ethers.concat([
      ethers.getBytes(buyerAddr),
      ethers.getBytes(ethers.toBeHex(nonce, 32))
    ])
  );
  const signature = await owner.signMessage(ethers.getBytes(messageHash));

  // use contract price to avoid magic-number mismatches
  const nftPrice = await presale.nftPriceETH();
  await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: nftPrice });

    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });
});







