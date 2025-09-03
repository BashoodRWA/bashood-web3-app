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
    await mockNFT.mintTo(await owner.getAddress(), 1, 10);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

    const Presale = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    // manual-deploy to avoid ContractFactory.deploy constructor issues
    const deployArgs = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await projectWallet.getAddress(),
      ethers.parseEther("0.1"),
      ethers.parseEther("0.2"),
      0,
      0,
      100
    ];
    let tmpPresaleAddr;
    const deployTx = Presale.getDeployTransaction(...deployArgs);
    if (!deployTx || !deployTx.data || deployTx.data.length <= 2) {
      // fallback to deploy
      const instance = await Presale.deploy(...deployArgs);
      await instance.waitForDeployment();
      tmpPresaleAddr = instance.target || instance.address;
      presale = instance;
    } else {
      const sent = await owner.sendTransaction({ to: undefined, data: deployTx.data });
      const receipt = await sent.wait();
      presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);
    }

  // Transfer some NFTs from owner to presale so purchases can succeed
  const ownerAddr = await owner.getAddress();
  const presaleAddr = tmpPresaleAddr || (await presale.getAddress());
  await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});
    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});
  await mockBHT.mint(await buyer.getAddress(), ethers.parseEther("1000000"));
  await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("1000000"));
  });

  it("allows purchaseWithBHT when allowances and params correct (happy path)", async function () {
    await presale.connect(owner).startPresale();
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
  const blk = await ethers.provider.getBlock('latest');
  const nowTs = blk.timestamp || Math.floor(Date.now() / 1000);
  await mockPrice.setPrice(ethers.parseUnits('1', 8), nowTs);
  await ethers.provider.send('evm_mine');
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
  await ethers.provider.send('evm_mine');
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("1"));
  const nonce = 1;
  const buyerAddr = await buyer.getAddress();
  // Match Solidity: keccak256(abi.encodePacked(address (20 bytes), uint256 (32 bytes)))
  // Normalize hashing/signing to ethers v6 helpers: solidityPackedKeccak256 + signMessage(getBytes(hash))
  const messageHash = ethers.solidityPackedKeccak256([
    'address', 'uint256'
  ], [buyerAddr, nonce]);
  const signature = await owner.signMessage(ethers.getBytes(messageHash));
    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });
});

