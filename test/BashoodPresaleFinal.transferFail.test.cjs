if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - BHT transfer to projectWallet fails", function () {
  it('reverts when projectWallet rejects token transfers', async function () {
    const [owner, buyer, rejectAddr] = await ethers.getSigners();

    const MockBHTRejecting = await ethers.getContractFactory("contracts/mocks/MockBHTRejecting.sol:MockBHTRejecting");
    const mockBHT = await MockBHTRejecting.deploy('MockBHT', 'MBHT', await rejectAddr.getAddress());
    await mockBHT.waitForDeployment();

    const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
    await mockNFT.mint(await owner.getAddress(), 1, 2);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    const referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  const Presale = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    const presaleArgs = [
      await mockBHT.getAddress(),
      await mockNFT.getAddress(),
      await referral.getAddress(),
      await rejectAddr.getAddress(), // projectWallet is a rejecting address
      ethers.parseEther("0.01"),
      ethers.parseEther("0.02"),
      0,0,100
    ];

    const tx = await Presale.getDeployTransaction(...presaleArgs);
    const sent = await owner.sendTransaction({ data: tx.data });
    const receipt = await sent.wait();
    const presale = await ethers.getContractAt('BashoodPresaleFinal', receipt.contractAddress);

    await presale.connect(owner).setSigner(await owner.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).startPresale();

    // setup price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    await mockPrice.setPrice(ethers.parseUnits('1', 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // buyer funds and approval
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('5'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('5'));

    // transfer NFT to presale
    await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');

    const nonce = 801;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(ethers.concat([ethers.getBytes(buyerAddr), ethers.getBytes(ethers.toBeHex(nonce, 32))]));
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature)).to.be.reverted;
  });
});
