if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const { ethers } = require("hardhat");

describe("BashoodPresaleFinal - focused2", function () {
  let owner, buyer, referrer, projectWallet;
  let mockBHT, mockNFT, referral, presale;

  beforeEach(async function () {
    [owner, buyer, referrer, projectWallet] = await ethers.getSigners();

  const MockBHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
  mockBHT = await MockBHT.deploy();
    await mockBHT.waitForDeployment();

  const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();
  await mockNFT.mint(await owner.getAddress(), 1, 10);

    const Referral = await ethers.getContractFactory("BashoodReferral");
    referral = await Referral.deploy(await owner.getAddress(), await owner.getAddress(), await mockNFT.getAddress());
    await referral.waitForDeployment();

  const Presale = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
    console.log('DEBUG-TEST: Presale factory deploy inputs length =', (Presale.interface && Presale.interface.deploy && Presale.interface.deploy.inputs && Presale.interface.deploy.inputs.length) || 0);
    console.log('DEBUG-TEST: Presale factory deploy inputs types =', (Presale.interface && Presale.interface.deploy && Presale.interface.deploy.inputs && Presale.interface.deploy.inputs.map(i=>i.type)) || []);
    const testArgs = [
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
    // Try normal factory deploy; if ethers ContractFactory.deploy throws constructor length error,
    // fall back to manual deploy via getDeployTransaction + owner.sendTransaction.
    // Deploy presale manually via getDeployTransaction to avoid ContractFactory.deploy issues in this test runner.
    console.log('DEBUG-TEST: about to call getDeployTransaction');
    let tx;
    try {
      tx = await Presale.getDeployTransaction(...testArgs);
      console.log('DEBUG-TEST: getDeployTransaction returned data length', tx && tx.data && tx.data.length);
    } catch (err) {
      console.error('DEBUG-TEST: getDeployTransaction ERROR', err && err.stack || err);
      throw err;
    }

    console.log('DEBUG-TEST: about to send transaction to deploy');
    let sent;
    try {
      sent = await owner.sendTransaction({ data: tx.data });
      console.log('DEBUG-TEST: sent tx hash', sent && sent.hash);
    } catch (err) {
      console.error('DEBUG-TEST: sendTransaction ERROR', err && err.stack || err);
      throw err;
    }

    console.log('DEBUG-TEST: waiting for receipt');
    let receipt;
    try {
      receipt = await sent.wait();
      console.log('DEBUG-TEST: receipt obtained, contractAddress=', receipt && receipt.contractAddress);
    } catch (err) {
      console.error('DEBUG-TEST: receipt.wait ERROR', err && err.stack || err);
      throw err;
    }

    const deployedPresaleAddress = receipt && receipt.contractAddress;
    presale = await ethers.getContractAt('BashoodPresaleFinal', deployedPresaleAddress);
    await presale.waitForDeployment();

    // Transfer NFTs to presale
    const ownerAddr = await owner.getAddress();
    const presaleAddr = await presale.getAddress();
    await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

  await presale.connect(owner).setOperationsWallet(await owner.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  await presale.connect(owner).grantRole(await presale.ADMIN_ROLE(), await owner.getAddress());
  await presale.connect(owner).setSigner(await owner.getAddress());
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther("10"));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("10"));
  });

  it("should allow purchaseWithBHT happy path and increment totals", async function () {
    await presale.connect(owner).startPresale();
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockPrice = await MockPrice.deploy();
    await mockPrice.waitForDeployment();
    // set initial price and updatedAt on the mock oracle
    await mockPrice.setPrice(ethers.parseUnits("1", 18), Math.floor(Date.now() / 1000));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());

    // prepare signature as existing tests do
    const nonce = 1;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);
    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);
  });

  it("purchaseWithETH should revert on missing signature or invalid allowed id", async function () {
    // Ensure signer is explicitly set so _verifySignature reverts with E12 on invalid signature
    await presale.connect(owner).setSigner(await owner.getAddress());
    await presale.connect(owner).startPresale();
    // try ETH purchase with a signature that is correctly formed but NOT signed by the authorized signer
    const nonce = 2;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    // signature created by the buyer (not the configured signer) => _verifySignature should return false and revert with 'E12'
    const badSignature = await buyer.signMessage(ethers.getBytes(messageHash));
    await expect(presale.connect(buyer).purchaseWithETH(1, 1, nonce, badSignature, { value: ethers.parseEther('0.1') }))
      .to.be.revertedWith('E12');
  });
});
