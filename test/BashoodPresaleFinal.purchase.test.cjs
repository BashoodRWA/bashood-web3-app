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
  const MockPriceFeed = await ethers.getContractFactory("contracts/MockPriceFeed.sol:MockPriceFeed");
  const mockPriceFeed = await MockPriceFeed.deploy(2000, 8);
  await mockPriceFeed.waitForDeployment();

  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const nftPriceETH = ethers.parseEther("0.01");
    const nftPriceBHT = ethers.parseUnits("1000", 18);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    // Use manual deploy fallback within mocha tests to avoid ContractFactory.deploy issues
    const deployArgs = [
      await bashoodToken.getAddress(),
      await nft.getAddress(),
      await referral.getAddress(),
      projectWallet.address,
      nftPriceETH,
      nftPriceBHT,
      now - 10,
      now + 3600,
      maxSupply
    ];
    let presale;
    try {
      const deployTx = BashoodPresaleFinal.getDeployTransaction(...deployArgs);
      if (deployTx && deployTx.data && deployTx.data.length > 2) {
        const sent = await deployer.sendTransaction({ to: undefined, data: deployTx.data });
        const receipt = await sent.wait();
        presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);
      } else {
        const instance = await BashoodPresaleFinal.deploy(...deployArgs);
        await instance.waitForDeployment();
        presale = instance;
      }
    } catch (err) {
      throw err;
    }

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

    if (mockPriceFeed.setAnswer) await mockPriceFeed.setAnswer(100000000);

    return { deployer, user, signer, projectWallet, bashoodToken, nft, referral, mockPriceFeed, presale, nftPriceBHT };
  }

  it("setupPresaleActivo deja la preventa activa dentro del rango esperado", async function () {
    const { presale } = await setupPresaleActivo();
    const presaleStart = Number(await presale.presaleStart());
    const presaleEnd = Number(await presale.presaleEnd());
    const block = await ethers.provider.getBlock("latest");
    const ts = block.timestamp;
    expect(ts).to.be.at.least(presaleStart);
    expect(ts).to.be.lessThan(presaleEnd + 1);
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
  const MockPriceFeed = await ethers.getContractFactory("contracts/MockPriceFeed.sol:MockPriceFeed");
    const localMockPriceFeed = await MockPriceFeed.deploy(100000000, 8);
    await localMockPriceFeed.waitForDeployment();
  const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const nftPriceETH = ethers.parseEther("0.01");
    const nftPriceBHT = ethers.parseUnits("1000", 18);
    const now = Math.floor(Date.now() / 1000);
  const deployTx = BashoodPresaleFinal.getDeployTransaction(
      await localBashoodToken.getAddress(),
      await localNft.getAddress(),
      await localReferral.getAddress(),
      localProjectWallet.address,
      nftPriceETH,
      nftPriceBHT,
      now - 1000,
      now - 100,
      100
    );
  // Deploy fallback: prefer raw deployTx if available, otherwise call factory.deploy(...)
  let localPresale;
  if (deployTx && deployTx.data && deployTx.data.length > 2) {
    const sentLocal = await localDeployer.sendTransaction({ to: undefined, data: deployTx.data });
    const receiptLocal = await sentLocal.wait();
    localPresale = await ethers.getContractAt('BashoodPresaleFinal', receiptLocal.contractAddress);
  } else {
    const instance = await BashoodPresaleFinal.deploy(
      await localBashoodToken.getAddress(),
      await localNft.getAddress(),
      await localReferral.getAddress(),
      localProjectWallet.address,
      nftPriceETH,
      nftPriceBHT,
      now - 1000,
      now - 100,
      100
    );
    await instance.waitForDeployment();
    localPresale = instance;
  }
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
    if (localMockPriceFeed.setAnswer) await localMockPriceFeed.setAnswer(100000000);

    const nftId = 1;
    const quantity = 1;
    const nonce = Math.floor(Math.random() * 1e6);
  // normalize to ethers v6 helper
  const messageHash = ethers.solidityPackedKeccak256(["address", "uint256"], [localUser.address, nonce]);
  const signature = await localSigner.signMessage(ethers.getBytes(messageHash));

    await expect(localPresale.connect(localUser).purchaseWithBHT(nftId, quantity, nonce, signature)).to.be.revertedWith("Presale not active");
  });
});
