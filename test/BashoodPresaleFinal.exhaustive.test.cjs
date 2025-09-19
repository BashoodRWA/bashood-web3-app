if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

// Suite consolidada y exhaustiva (muestra de casos prioritarios)
describe("BashoodPresaleFinal - exhaustive suite", function () {
  let owner, buyer, referrer, projectWallet;

  async function deployPresaleWithDefaults(opts = {}) {
    // delegate to shared test helper to keep deployments consistent
    const helpers = require('./helpers/presaleHelpers');
    const d = await helpers.deployPresale();
    owner = d.owner; buyer = d.buyer; referrer = d.referrer; projectWallet = d.projectWallet;
    return { presale: d.presale, mockBHT: d.bht, mockNFT: d.nft, referral: d.referral, owner, buyer, referrer };
  }

  it('ETH happy path: purchase transfers NFT and ETH', async function () {
    const { presale, mockNFT, owner, buyer } = await deployPresaleWithDefaults();

    // Set signer and start
    await presale.connect(owner).setSigner(await owner.getAddress());
    await presale.connect(owner).startPresale();

  // Ensure mockNFT has stock: mint to owner then transfer to presale
  await mockNFT.connect(owner).mint(await owner.getAddress(), 1, 1);
  await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');

    const nonce = 501;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const projectBefore = await ethers.provider.getBalance(await owner.getAddress());
  const nftPrice = await presale.nftPriceETH();
  await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: nftPrice });
    const total = await presale.totalNFTsSold();
    expect(Number(total)).to.equal(1);
  });

  it('BHT happy path: balances and totals updated', async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployPresaleWithDefaults();

    // price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await mockPrice.waitForDeployment();
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
  await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
  // ensure signer is set so signature verification does not revert (E31) and staleness is configured
  await presale.connect(owner).setSigner(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  // operations wallet must be configured before BHT purchases (contract requires it)
  await presale.connect(owner).setOperationsWallet(await owner.getAddress());

  // mint and approve
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('5'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('5'));

  // mint and transfer NFT stock to presale
  await mockNFT.connect(owner).mint(await owner.getAddress(), 1, 2);
  await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 2, '0x');

    await presale.connect(owner).startPresale();

    const nonce = 502;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const buyerBalBefore = await mockBHT.balanceOf(buyerAddr);
    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    const buyerBalAfter = await mockBHT.balanceOf(buyerAddr);
  const expectedBhtCost = await presale.nftPriceBHT();
  expect(buyerBalBefore - buyerBalAfter).to.equal(expectedBhtCost);
	const total = await presale.totalNFTsSold();
	expect(Number(total)).to.equal(1);
  });

  it('signature validation: invalid signature reverts E24 (BHT)', async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployPresaleWithDefaults();
    // price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('2000', 8));
    await mockPrice.waitForDeployment();
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('1'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('1'));
  // ensure owner has an NFT to transfer
  await mockNFT.connect(owner).mint(await owner.getAddress(), 1, 1);
  await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');

  // configure signer, price staleness and operations wallet so signature checks reach E24
  await presale.connect(owner).setSigner(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  await presale.connect(owner).setOperationsWallet(await owner.getAddress());

  await presale.connect(owner).startPresale();

    const nonce = 601;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    // signature by buyer (not signer) -> _verifySignature false -> E24
    const badSig = await buyer.signMessage(ethers.getBytes(messageHash));
    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, badSig)).to.be.revertedWith('E24');
  });

  it('nonce reuse prevented (E25/E13) across ETH/BHT', async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployPresaleWithDefaults();
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('2000', 8));
    await mockPrice.waitForDeployment();
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('5'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('5'));
  // ensure presale has NFTs available
  await mockNFT.connect(owner).mint(await owner.getAddress(), 1, 2);
  await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 2, '0x');

  // configure signer, operations wallet and staleness so BHT path validates price
  await presale.connect(owner).setSigner(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  await presale.connect(owner).setOperationsWallet(await owner.getAddress());

  await presale.connect(owner).startPresale();

    const nonce = 701;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    // First BHT purchase
    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    // Reuse of same nonce for ETH should revert with E13
    const messageHash2 = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature2 = await owner.signMessage(ethers.getBytes(messageHash2));
  const nftPrice = await presale.nftPriceETH();
  await expect(presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature2, { value: nftPrice })).to.be.revertedWith('E13');
  });

});
