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
    const signers = await ethers.getSigners();
    owner = signers[0]; buyer = signers[1]; referrer = signers[2]; projectWallet = signers[3];

    const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    const mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

    const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    await mockNFT.mint(await owner.getAddress(), 1, 20);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    const referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  const Presale = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const presaleArgs = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      opts.projectWallet || await projectWallet.getAddress(),
      ethers.parseEther("0.01"),
      ethers.parseEther("0.02"),
      0,
      0,
      100
    ];

    const tx = await Presale.getDeployTransaction(...presaleArgs);
    const sent = await owner.sendTransaction({ data: tx.data });
    const receipt = await sent.wait();
    const presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);

    // Admin setup
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress());

    return { presale, mockBHT, mockNFT, referral, owner, buyer, referrer };
  }

  it('ETH happy path: purchase transfers NFT and ETH', async function () {
    const { presale, mockNFT, owner, buyer } = await deployPresaleWithDefaults();

    // Set signer and start
    await presale.connect(owner).setSigner(await owner.getAddress());
    await presale.connect(owner).startPresale();

    // Transfer NFT to presale
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');

    const nonce = 501;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const projectBefore = await ethers.provider.getBalance(await owner.getAddress());
    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther('0.01') });
    const total = await presale.totalNFTsSold();
    expect(Number(total)).to.equal(1);
  });

  it('BHT happy path: balances and totals updated', async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployPresaleWithDefaults();

    // price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits('1', 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('5'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('5'));

    // transfer NFT
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 2, '0x');

    await presale.connect(owner).startPresale();

    const nonce = 502;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const buyerBalBefore = await mockBHT.balanceOf(buyerAddr);
    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    const buyerBalAfter = await mockBHT.balanceOf(buyerAddr);
    expect(buyerBalBefore - buyerBalAfter).to.equal(ethers.parseEther('0.02'));
	const total = await presale.totalNFTsSold();
	expect(Number(total)).to.equal(1);
  });

  it('signature validation: invalid signature reverts E24 (BHT)', async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployPresaleWithDefaults();
    // price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits('1', 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('1'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('1'));
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');

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
  const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits('1', 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('5'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('5'));
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 2, '0x');

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
    await expect(presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature2, { value: ethers.parseEther('0.01') })).to.be.revertedWith('E13');
  });

});
