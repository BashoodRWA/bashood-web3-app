if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('Targeted branches and edge cases', function () {
  let owner, projectWallet, alice, bob;

  beforeEach(async () => {
    [owner, projectWallet, alice, bob] = await ethers.getSigners();
  });

  it('ReferralValidator: constructor and isValid', async function () {
    const Ref = await ethers.getContractFactory('ReferralValidator');
    // valid deploy
    const ref = await Ref.deploy(owner.address);
  expect(await ref.isValid(owner.address)).to.equal(true);
  expect(await ref.isValid(ZERO_ADDRESS)).to.equal(false);

    // invalid deploy should revert
  await expect(Ref.deploy(ZERO_ADDRESS)).to.be.revertedWith('Invalid owner');
  });

  it('BashoodMultiToken: mint/mintBatch edge cases, mintAllNFTs and withdraw', async function () {
    const T = await ethers.getContractFactory('BashoodMultiToken');
    const m = await T.deploy(owner.address);

    // mintBatch to zero should revert (minter role allowed because constructor granted)
  await expect(m.connect(owner).mintBatch(ZERO_ADDRESS, [1], [1], '0x')).to.be.revertedWith('Cannot mint to zero address');

    // mint to zero should revert
  await expect(m.connect(owner).mint(ZERO_ADDRESS, 1, 1, '0x')).to.be.revertedWith('Cannot mint to zero address');

    // mintAllNFTs success path (onlyOwner) - should set nftOwners and increment nftCounter
    await m.connect(owner).mintAllNFTs();
    const nftCounter = await m.nftCounter();
    expect(nftCounter).to.be.gt(1);
    expect(await m.nftOwners(1)).to.equal(owner.address);

    // second call should revert
    await expect(m.connect(owner).mintAllNFTs()).to.be.revertedWith('NFTs ya han sido minteados');

    // withdrawFunds should revert when balance is zero
    await expect(m.connect(owner).withdrawFunds()).to.be.revertedWith('No hay fondos');

    // approveMarketplace emits MarketplaceApproved with 1 and 0
    const marketplace = bob.address;
    await expect(m.connect(alice).approveMarketplace(marketplace, true))
      .to.emit(m, 'MarketplaceApproved')
      .withArgs(alice.address, marketplace, 1);

    await expect(m.connect(alice).approveMarketplace(marketplace, false))
      .to.emit(m, 'MarketplaceApproved')
      .withArgs(alice.address, marketplace, 0);
  });

  it('BashoodPresaleFinal: admin setters and validation reverts', async function () {
  const MockERC = await ethers.getContractFactory('contracts/mocks/MockERC20.sol:MockERC20');
    const mockERC = await MockERC.deploy();
    await mockERC.waitForDeployment();

  const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();

    const Ref = await ethers.getContractFactory('ReferralValidator');
    const ref = await Ref.deploy(owner.address);
    await ref.waitForDeployment();

    const mockERCAddr = (typeof mockERC.getAddress === 'function') ? await mockERC.getAddress() : mockERC.address;
    const mockNFTAddr = (typeof mockNFT.getAddress === 'function') ? await mockNFT.getAddress() : mockNFT.address;
    const refAddr = (typeof ref.getAddress === 'function') ? await ref.getAddress() : ref.address;
    const projectWalletAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;

  const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
  const { deployPresale } = getPresaleHelpers();
  const helpers = await deployPresale({ bhtAddr: mockERCAddr, nftAddr: mockNFTAddr, referralAddr: refAddr, projectWallet: projectWalletAddr });
  const presale = helpers.presale;

    // setMaxPriceInvalid staleness: 1s-24h
  await expect(presale.connect(owner).setMaxPriceStaleness(0)).to.be.revertedWith('Invalid staleness: 1s-24h');

    // setOperationsWallet should revert on zero
  await expect(presale.connect(owner).setOperationsWallet(ZERO_ADDRESS)).to.be.revertedWith('Zero address');

    // setPriceFeed should revert on zero
  await expect(presale.connect(owner).setPriceFeed(ZERO_ADDRESS)).to.be.revertedWith('Zero address');

    // setSigner should accept a valid addr
    await presale.connect(owner).setSigner(alice.address);
    expect(await presale.signerAddress()).to.equal(alice.address);
  });
});






