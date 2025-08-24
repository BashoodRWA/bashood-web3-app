const { expect } = require('chai');
const { ethers } = require('hardhat');
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
    const MockERC = await ethers.getContractFactory('MockERC20');
    const mockERC = await MockERC.deploy();
    await mockERC.waitForDeployment();

    const MockNFT = await ethers.getContractFactory('MockNFT1155');
    const mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();

    const Ref = await ethers.getContractFactory('ReferralValidator');
    const ref = await Ref.deploy(owner.address);
    await ref.waitForDeployment();

    const mockERCAddr = (typeof mockERC.getAddress === 'function') ? await mockERC.getAddress() : mockERC.address;
    const mockNFTAddr = (typeof mockNFT.getAddress === 'function') ? await mockNFT.getAddress() : mockNFT.address;
    const refAddr = (typeof ref.getAddress === 'function') ? await ref.getAddress() : ref.address;
    const projectWalletAddr = (typeof projectWallet.getAddress === 'function') ? await projectWallet.getAddress() : projectWallet.address;

    const Presale = await ethers.getContractFactory('BashoodPresaleFinal');
    const presale = await Presale.deploy(
      mockERCAddr,
      mockNFTAddr,
      refAddr,
      projectWalletAddr,
      1, // nftPriceETH
      1, // nftPriceBHT
      0, // presaleStart
      0, // presaleEnd
      100 // maxNFTSupply
    );
    await presale.waitForDeployment();

    // setMaxPriceStaleness must be > 0
  await expect(presale.connect(owner).setMaxPriceStaleness(0)).to.be.revertedWith('Staleness must be > 0');

    // setOperationsWallet should revert on zero
  await expect(presale.connect(owner).setOperationsWallet(ZERO_ADDRESS)).to.be.revertedWith('Zero address');

    // setPriceFeed should revert on zero
  await expect(presale.connect(owner).setPriceFeed(ZERO_ADDRESS)).to.be.revertedWith('Zero address');

    // setSigner should accept a valid addr
    await presale.connect(owner).setSigner(alice.address);
    expect(await presale.signerAddress()).to.equal(alice.address);
  });
});
