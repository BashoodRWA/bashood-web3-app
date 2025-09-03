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
  priceFeed = await MockPriceFeed.deploy();
    await priceFeed.waitForDeployment();

  Referral = await ethers.getContractFactory('BashoodReferral');
  referral = await Referral.deploy(owner.address, owner.address, await nft.getAddress());
  await referral.waitForDeployment();

  // Deploy presale contract - prefer manual deploy via getDeployTransaction but
  // fall back to Factory.deploy(...) if the unsigned tx is not available.
  BPF = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
  const now = Math.floor(Date.now() / 1000);
  const deployArgs = [
    bht.getAddress ? await bht.getAddress() : (bht.address || bht.target),
    nft.getAddress ? await nft.getAddress() : (nft.address || nft.target),
    referral.getAddress ? await referral.getAddress() : (referral.address || referral.target),
    project.address,
    ethers.parseEther('0.01'), // nftPriceETH
    ethers.parseEther('1'), // nftPriceBHT (1 BHT)
    now - 10,
    now + 3600,
    100 // max supply
  ];
  let presaleAddress;
  try {
    const deployTx = BPF.getDeployTransaction(...deployArgs);
    if (deployTx && deployTx.data && deployTx.data.length > 2) {
      const sent = await owner.sendTransaction({ to: undefined, data: deployTx.data });
      const receipt = await sent.wait();
      presaleAddress = receipt.contractAddress;
    } else {
      // fallback to normal deploy
      const instance = await BPF.deploy(...deployArgs);
      await instance.waitForDeployment();
      presaleAddress = instance.target || instance.address;
    }
  } catch (err) {
    throw err;
  }
  presale = await ethers.getContractAt('BashoodPresaleFinal', presaleAddress);

    // set price feed and staleness
    await presale.setPriceFeed(priceFeed.getAddress ? await priceFeed.getAddress() : priceFeed.address);
    await presale.setMaxPriceStaleness(1000);

    // give presale some NFTs
    const presaleAddr = presale.getAddress ? await presale.getAddress() : presale.address;
    await nft.mint(presaleAddr, 1, 5);

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
    await priceFeed.setPrice(ethers.parseUnits('1', 8).toString(), Math.floor(Date.now() / 1000));

    // prepare a valid signature (owner is the configured signer)
    const nonce = 1;
    const messageHash = ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce]);
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const price = ethers.parseEther('0.01');
    const before = await ethers.provider.getBalance(project.address);

    await expect(presale.connect(alice).purchaseWithETH(1, 1, nonce, signature, { value: price }))
      .to.emit(presale, 'AssetPurchased')
      .withArgs(alice.address, 1, 1, price);

    const after = await ethers.provider.getBalance(project.address);
    expect(after - before).to.equal(price);
    expect(await nft.balanceOf(alice.address, 1)).to.equal(1);
  });

  it('purchaseWithETH: reverts when msg.value incorrect and when not allowed nftId or out of stock', async function () {
    const nonce = 2;
    // valid signature but nft id not allowed
    const sig1 = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce])));
    await expect(presale.connect(alice).purchaseWithETH(99, 1, nonce, sig1, { value: ethers.parseEther('0.01') }))
      .to.be.revertedWith('E14');

    // allowed id but not enough stock
    const nonce2 = 3;
    const sig2 = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce2])));
    await expect(presale.connect(alice).purchaseWithETH(1, 10, nonce2, sig2, { value: ethers.parseEther('0.1') }))
      .to.be.revertedWith('E16');

    // incorrect msg.value
    const nonce3 = 4;
    const sig3 = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce3])));
    await expect(presale.connect(alice).purchaseWithETH(1, 1, nonce3, sig3, { value: ethers.parseEther('0.02') }))
      .to.be.revertedWith('E18');
  });

  it('purchaseWithBHT: success and failure paths for allowance and nonce reuse', async function () {
    // set price feed
    await priceFeed.setPrice(ethers.parseUnits('1', 8).toString(), Math.floor(Date.now() / 1000));
    // mint BHT to alice and approve presale
    await bht.mint(alice.address, ethers.parseEther('10'));
    await bht.connect(alice).approve(presale.getAddress ? await presale.getAddress() : presale.address, ethers.parseEther('10'));

    // successful purchase with correct signature
    const nonce = 5;
    const sig = await owner.signMessage(ethers.getBytes(ethers.solidityPackedKeccak256(['address','uint256'], [alice.address, nonce])));

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
    // call delegateRescueUnsoldNfts without rescue set
    await expect(presale.delegateRescueUnsoldNfts(1, alice.address, 1)).to.be.revertedWith('E45');
  });
});
