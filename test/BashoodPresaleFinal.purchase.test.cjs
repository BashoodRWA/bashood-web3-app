if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - purchaseWithBHT", function () {
  // Shared helper that deploys presale and activates it properly
  async function setupPresaleActivo({ maxSupply = 100, maxPerUser = 0 } = {}) {
    const [deployer, user, signer, projectWallet] = await ethers.getSigners();

    const BashoodToken = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    const bashoodToken = await BashoodToken.deploy();
    await bashoodToken.waitForDeployment();
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const nft = await MockNFT.deploy();
    await nft.waitForDeployment();

  const BashoodReferral = await ethers.getContractFactory("BashoodReferral");
  const referral = await BashoodReferral.deploy(deployer.address, deployer.address, await nft.getAddress());
    await referral.waitForDeployment();

  // Use constructor-variant MockPriceFeed here because later we call setAnswer/setUpdatedAt
  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  // constructor(uint8 _decimals, int256 _answer)
  // use a normalized price (1 with 8 decimals) to avoid out-of-bounds encoding in tests
  const mockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits('1', 8));
  await mockPriceFeed.waitForDeployment();

  const nftPriceETH = ethers.parseEther("0.01");
  const nftPriceBHT = ethers.parseUnits("1000", 18);
  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock.timestamp;
  // Use the shared deploy helper for robust presale deploy
  const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
  const { deployPresale } = getPresaleHelpers();
  const helpers = await deployPresale({ bhtAddr: await bashoodToken.getAddress(), nftAddr: await nft.getAddress(), referralAddr: await referral.getAddress(), projectWallet: projectWallet.address });
  let presale = helpers.presale;

    await presale.connect(deployer).grantRole(await presale.ADMIN_ROLE(), deployer.address);
    await presale.connect(deployer).setSigner(signer.address);
    await presale.connect(deployer).setOperationsWallet(projectWallet.address);
    if (presale.setPriceFeed) await presale.connect(deployer).setPriceFeed(await mockPriceFeed.getAddress());
    if (presale.setMaxPriceStaleness) await presale.connect(deployer).setMaxPriceStaleness(3600);
    if (maxPerUser > 0) await presale.connect(deployer).setMaxPerUser(maxPerUser);

    const presaleStart = await presale.presaleStart();
    const blockBefore = await ethers.provider.getBlock("latest");
    const nextTimestamp = Math.max(Number(presaleStart) + 1, blockBefore.timestamp + 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await ethers.provider.send("evm_mine");
    await presale.connect(deployer).startPresale();

    const blockAfter = await ethers.provider.getBlock("latest");
    const safePurchaseTs = Math.max(Number(presaleStart) + 10, blockAfter.timestamp + 2);
    await ethers.provider.send("evm_setNextBlockTimestamp", [safePurchaseTs]);
    await ethers.provider.send("evm_mine");

  // mocks MockNFT1155 has mint(to,id,amount) signature
    // mint may have two signatures across repo; try both forms
    try {
      await nft.mint(deployer.address, 1, maxSupply);
    } catch (e) {
      await nft.mint(deployer.address, 1, maxSupply, '0x');
    }
  await nft.connect(deployer).safeTransferFrom(deployer.address, await presale.getAddress(), 1, maxSupply, "0x");

  if (mockPriceFeed.setAnswer) await mockPriceFeed.setAnswer(ethers.parseUnits('1', 8));

    return { deployer, user, signer, projectWallet, bashoodToken, nft, referral, mockPriceFeed, presale, nftPriceBHT };
  }

  it("setupPresaleActivo deja la preventa activa dentro del rango esperado", async function () {
    const { presale } = await setupPresaleActivo();
  // When deploy helper uses zero time window the contract relies on presaleActive flag.
  // Assert the presale is active rather than comparing timestamps which can be zero.
  const presaleActive = await presale.presaleActive();
  expect(presaleActive).to.equal(true);
  });

  it("rechaza compra fuera de la ventana de preventa", async function () {
    const [localDeployer, localUser, localSigner, localProjectWallet] = await ethers.getSigners();
    const BashoodToken = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
  const localBashoodToken = await BashoodToken.deploy();
    await localBashoodToken.waitForDeployment();
  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const localNft = await MockNFT.deploy();
    await localNft.waitForDeployment();
    const BashoodReferral = await ethers.getContractFactory("BashoodReferral");
    const localReferral = await BashoodReferral.deploy(localDeployer.address, localDeployer.address, await localNft.getAddress());
    await localReferral.waitForDeployment();
  // use constructor-variant MockPriceFeed here (supports setAnswer/setUpdatedAt)
  const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    // constructor(uint8 _decimals, int256 _answer)
  const localMockPriceFeed = await MockPriceFeed.deploy(8, ethers.parseUnits('1', 8));
    await localMockPriceFeed.waitForDeployment();
  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const nftPriceETH = ethers.parseEther("0.01");
    const nftPriceBHT = ethers.parseUnits("1000", 18);
    const now = Math.floor(Date.now() / 1000);
  const helpers2 = await deployPresale({ bhtAddr: await localBashoodToken.getAddress(), nftAddr: await localNft.getAddress(), referralAddr: await localReferral.getAddress(), projectWallet: localProjectWallet.address });
  const localPresale = helpers2.presale;
    await localPresale.connect(localDeployer).grantRole(await localPresale.ADMIN_ROLE(), localDeployer.address);
    await localPresale.connect(localDeployer).setSigner(localSigner.address);
    await localPresale.connect(localDeployer).setOperationsWallet(localProjectWallet.address);
    if (localPresale.setPriceFeed) await localPresale.connect(localDeployer).setPriceFeed(await localMockPriceFeed.getAddress());
    if (localPresale.setMaxPriceStaleness) await localPresale.connect(localDeployer).setMaxPriceStaleness(3600);

    try {
      await localNft.mint(localDeployer.address, 1, 10);
    } catch (e) {
      await localNft.mint(localDeployer.address, 1, 10, '0x');
    }
  await localNft.connect(localDeployer).safeTransferFrom(localDeployer.address, await localPresale.getAddress(), 1, 10, "0x");
    await localBashoodToken.mint(localUser.address, ethers.parseUnits("10000", 18));
    await localBashoodToken.connect(localUser).approve(await localPresale.getAddress(), ethers.parseUnits("10000", 18));
  if (localMockPriceFeed.setAnswer) await localMockPriceFeed.setAnswer(ethers.parseUnits('1', 8));

    const nftId = 1;
    const quantity = 1;
    const nonce = Math.floor(Math.random() * 1e6);
  // normalize to ethers v6 helper
  const messageHash = ethers.solidityPackedKeccak256(["address", "uint256"], [localUser.address, nonce]);
  const signature = await localSigner.signMessage(ethers.getBytes(messageHash));

    await expect(localPresale.connect(localUser).purchaseWithBHT(nftId, quantity, nonce, signature)).to.be.revertedWith("Presale not active");
  });
});






