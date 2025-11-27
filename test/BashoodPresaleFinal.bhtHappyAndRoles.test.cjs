if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - BHT happy path and role checks", function () {
  let owner, buyer, projectWallet;

  async function deployAndSetup(customProjectWalletAddress) {
    // reuse shared helper to avoid constructor mismatch issues
    const helpers = getPresaleHelpers();
    const d = await helpers.deployPresale({});
    owner = d.owner; buyer = d.buyer; projectWallet = d.projectWallet;
    // ensure presale sanity: signer, ops wallet and staleness are set for tests
    const presale = d.presale;
    await presale.connect(owner).setSigner(await owner.getAddress());
    await presale.connect(owner).setOperationsWallet(await owner.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(1000);
    return { presale, mockBHT: d.bht, mockNFT: d.nft, referral: d.referral, owner, buyer, projectAddr: customProjectWalletAddress || d.projectWallet.address };
  }

  it("happy path BHT purchase updates totals and balances", async function () {
    const { presale, mockBHT, mockNFT, owner, buyer, projectAddr } = await deployAndSetup();

    // deploy and set a fresh price feed with price = 1
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
  await mockPrice.waitForDeployment();
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
  await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // Ensure presale holds at least 1 NFT so require(nftContract.balanceOf(address(this), nftId) >= quantity, "E28") doesn't revert
    // MockNFT may have either mint(owner,id,amount) or mint(to,id,amount,bytes) signature; try both
    try {
      await mockNFT.mint(await presale.getAddress(), 1, 1);
    } catch (e) {
      try {
        await mockNFT.mint(await presale.getAddress(), 1, 1, '0x');
      } catch (e2) {
        // fallback: mint to owner then transfer to presale
        await mockNFT.mint(await owner.getAddress(), 1, 1);
        await mockNFT.connect(owner).safeTransferFrom(await owner.getAddress(), await presale.getAddress(), 1, 1, '0x');
      }
    }

    // mint and approve exact discounted cost
    // For 1 NFT: baseCost = nftPriceBHT = 0.2 BHT (as set in constructor args), discount bps = 0, burn bps = 0 => discountedCost = 0.2
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
    // approve the presale for at least discounted cost
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('1'));

    await presale.connect(owner).startPresale();

    const nonce = 77;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    const buyerBalanceBefore = await mockBHT.balanceOf(buyerAddr);
    const opsBalanceBefore = await mockBHT.balanceOf(await owner.getAddress());

    await presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature);

    const totalSold = await presale.totalNFTsSold();
    expect(Number(totalSold)).to.equal(1);

    const buyerBalanceAfter = await mockBHT.balanceOf(buyerAddr);
    const opsBalanceAfter = await mockBHT.balanceOf(await owner.getAddress());

  // derive expected discounted cost from the deployed presale (keeps test robust to constructor defaults)
  const nftPriceBHT = await presale.nftPriceBHT();
  const expectedDiscounted = nftPriceBHT; // quantity == 1, discount bps == 0 in this test
  // buyer balance should decrease by discounted cost
  expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(expectedDiscounted);
  // ops wallet (owner) should receive opsAmount (since burnBps = 0, opsAmount == discountedCost)
  expect(opsBalanceAfter - opsBalanceBefore).to.equal(expectedDiscounted);
  });

  it("reverts E22 when buyer is the signer", async function () {
    const { presale, mockBHT, mockNFT, owner, buyer } = await deployAndSetup();
    // set signer to buyer
    await presale.connect(owner).setSigner(await buyer.getAddress());

    // set price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await mockPrice.waitForDeployment();
    await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve
    await mockBHT.mint(await buyer.getAddress(), ethers.parseEther('10'));
    await mockBHT.connect(buyer).approve(await presale.getAddress(), ethers.parseEther('10'));

    await presale.connect(owner).startPresale();

    const nonce = 88;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, nonce, signature)
    ).to.be.revertedWith('E22');
  });

  it("reverts E23 when buyer is the deployer", async function () {
    const { presale, mockBHT, mockNFT, owner } = await deployAndSetup();
    // owner is deployer (constructor granted deployer = msg.sender)

    // price feed
  const MockPrice = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  // MockPriceFeed constructor expects (uint8 decimals, int256 answer)
  const mockPrice = await MockPrice.deploy(8, ethers.parseUnits('1', 8));
    await mockPrice.waitForDeployment();
  await setPriceFresh(mockPrice, ethers.parseUnits('1', 8));
    await presale.connect(owner).setPriceFeed(await mockPrice.getAddress());

    // mint and approve to owner (who will attempt to buy)
    await mockBHT.mint(await owner.getAddress(), ethers.parseEther('10'));
    await mockBHT.connect(owner).approve(await presale.getAddress(), ethers.parseEther('10'));

  // Ensure signer is NOT the owner so E22 doesn't short-circuit the check for E23
  // use the projectWallet signer (third account) as the authorized signer
  const signers = await ethers.getSigners();
  const projectSigner = signers[2];
  await presale.connect(owner).setSigner(await projectSigner.getAddress());
  await presale.connect(owner).startPresale();

    const nonce = 99;
    const ownerAddr = await owner.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(ownerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await expect(
      presale.connect(owner).purchaseWithBHT(1, 1, nonce, signature)
    ).to.be.revertedWith('E23');
  });

});






