if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('BashoodPresaleFinal - focused branches', function () {
  let owner, alice, bob, project;
  let BPF, presale;
  let MockBHT, bht;
  let MockNFT1155, nft;
  let MockPriceFeed, priceFeed;
  let Referral, referral;

  beforeEach(async function () {
    [owner, alice, bob, project] = await ethers.getSigners();

    // Deploy mocks using fully-qualified names to avoid ambiguous artifacts
    MockBHT = await ethers.getContractFactory('contracts/mocks/MockBHT.sol:MockBHT');
    bht = await MockBHT.deploy();
    await bht.waitForDeployment();

    MockNFT1155 = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    nft = await MockNFT1155.deploy();
    await nft.waitForDeployment();

  MockPriceFeed = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  // MockPriceFeed constructor expects (uint8 decimals, int256 initialAnswer)
  priceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits('1', 8));
    await priceFeed.waitForDeployment();

  Referral = await ethers.getContractFactory('BashoodReferral');
  referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress());
  await referral.waitForDeployment();

  // Deploy presale using shared helper to avoid getDeployTransaction issues
  const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
  const { deployPresale } = getPresaleHelpers();
  const now = Math.floor(Date.now() / 1000);
  const helpers = await deployPresale({ bhtAddr: (bht.getAddress ? await bht.getAddress() : (bht.address || bht.target)), nftAddr: (nft.getAddress ? await nft.getAddress() : (nft.address || nft.target)), referralAddr: (referral.getAddress ? await referral.getAddress() : (referral.address || referral.target)), projectWallet: project.address });
  presale = helpers.presale;

  // set price feed and staleness
  await presale.setPriceFeed(await priceFeed.getAddress());
  await presale.setMaxPriceStaleness(1000);
  // ensure signer is set so signature checks succeed
  await presale.setSigner(owner.address);

    // give presale some NFTs (defensivo: si ya tiene, el try/catch lo ignora)
    const presaleAddr = await presale.getAddress();
    try { await nft.mint(presaleAddr, 1, 5); } catch (e) { /* ignore if already minted */ }

    // allow operations wallet and burn settings
    await presale.setOperationsWallet(project.address);
    await presale.setBurnBps(0);
    await presale.setDiscountBps(0);

  // set signer (owner will sign)
  await presale.setSigner(owner.address);

    // activate presale via startPresale role
    // grant ADMIN_ROLE to owner already; use startPresale
    await presale.startPresale();
  });

  it('purchaseWithETH: success happy path and project wallet receive', async function () {
    // set price feed to a valid price and updatedAt
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
  await mockPrice.waitForDeployment();
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
  // set numeric price on price feed (was incorrectly passing an address)
  await setPriceFresh(priceFeed, ethers.parseUnits('1', 8));

    // prepare a valid signature (owner is the configured signer)
    const nonce = 1;
    const messageHash = ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce]);
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

  const price = await presale.nftPriceETH();
    const before = await ethers.provider.getBalance(project.address);

    await expect(presale.connect(alice).purchaseWithETH(1, 1, nonce, signature, { value: price }))
      .to.emit(presale, 'AssetPurchased')
      .withArgs(alice.address, 1, 1, price);

  const after = await ethers.provider.getBalance(project.address);
  // With pull-payment the ETH is scheduled for the project wallet and not forwarded immediately
  expect(after - before).to.equal(0);
  expect(await presale.pendingWithdrawals(project.address)).to.equal(price);
    expect(await nft.balanceOf(alice.address, 1)).to.equal(1);
  });

  it('purchaseWithETH: reverts when msg.value incorrect and when not allowed nftId or out of stock', async function () {
    const nonce = 2;
    const nftPrice = await presale.nftPriceETH();
    // valid signature but nft id not allowed — use contract price
    const sig1 = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce])));
    await expect(presale.connect(alice).purchaseWithETH(99, 1, nonce, sig1, { value: nftPrice }))
      .to.be.revertedWith('E14');

    // allowed id but not enough stock — send correct total value for 10 units to ensure E16
    const nonce2 = 3;
    const sig2 = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce2])));
    await expect(presale.connect(alice).purchaseWithETH(1, 10, nonce2, sig2, { value: nftPrice * 10n }))
      .to.be.revertedWith('E16');

    // incorrect msg.value — send a wrong amount relative to contract price to trigger E18
    const nonce3 = 4;
    const sig3 = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce3])));
    await expect(presale.connect(alice).purchaseWithETH(1, 1, nonce3, sig3, { value: nftPrice * 2n }))
      .to.be.revertedWith('E18');
  });

  it('purchaseWithBHT: success and failure paths for allowance and nonce reuse', async function () {
    // set price feed
  // ensure price and timestamp are fresh
  await setPriceFresh(priceFeed, ethers.parseUnits('1', 8));
  // mint BHT to alice and approve presale
  await bht.mint(alice.address, ethers.parseEther('10'));
  await bht.connect(alice).approve(presale.getAddress ? await presale.getAddress() : presale.address, ethers.parseEther('10'));

    // successful purchase with correct signature
    const nonce = 5;
    const sig = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce])));

  // ensure presale has NFT stock for this test
  const presaleAddr = await presale.getAddress();
  try { await nft.mint(presaleAddr, 1, 5); } catch (e) { /* ignore if already minted */ }
  await expect(presale.connect(alice).purchaseWithBHT(1, 1, nonce, sig))
      .to.emit(presale, 'AssetPurchased')
      .withArgs(alice.address, 1, 1, ethers.parseEther('1'));

    // nonce reuse should fail (E25)
    await expect(presale.connect(alice).purchaseWithBHT(1, 1, nonce, sig)).to.be.revertedWith('E25');

    // insufficient allowance path
    const nonce2 = 6;
    // mint a fresh account with small allowance
    await bht.mint(bob.address, ethers.parseEther('1'));
    await bht.connect(bob).approve(presale.getAddress ? await presale.getAddress() : presale.address, ethers.parseEther('0.1'));
    const sigBob = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [bob.address, nonce2])));
    await expect(presale.connect(bob).purchaseWithBHT(1, 1, nonce2, sigBob)).to.be.revertedWith('E30');
  });

  it('rescue delegation failures when rescueContract not set or projectWallet reverts', async function () {
    // Funciones reactivadas para mejorar coverage
    // call delegateRescueUnsoldNfts without rescue set
    await expect(presale.delegateRescueUnsoldNfts(1, alice.address, 1)).to.be.revertedWith('E45');
  });
});






