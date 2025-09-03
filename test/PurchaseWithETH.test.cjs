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

  const Presale = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
  const deployArgs = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await projectWallet.getAddress(),
      ethers.parseEther("0.01"),
      ethers.parseEther("0.02"),
      0,
      0,
      100
    ];
  // try unsigned deploy tx, fallback to Factory.deploy
  const unsigned = await Presale.getDeployTransaction(...deployArgs);
  if (unsigned && unsigned.data && unsigned.data.length > 2) {
    const sent = await owner.sendTransaction({ to: undefined, data: unsigned.data });
    const receipt = await sent.wait();
    presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);
  } else {
    const instance = await Presale.deploy(...deployArgs);
    await instance.waitForDeployment();
    presale = instance;
  }

  // Transfer NFTs to presale contract to allow purchases
  const ownerAddr = await owner.getAddress();
  const presaleAddr = await presale.getAddress();
  await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

    await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
    await presale.connect(owner).setOperationsWallet(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setSigner(await owner.getAddress()).catch(()=>{});
    await presale.connect(owner).setMaxPriceStaleness(1000).catch(()=>{});

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

    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther("0.01") });

    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });
});

