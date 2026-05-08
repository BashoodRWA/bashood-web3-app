if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe('Presale coverage - step6 (targeted branches)', function () {
  it('falls back to transferFrom when burnFrom not available and ops transfer fails', async function () {
    // need to pass MockBHTReturnFalse constructor args (name, symbol, rejectTo)
    const signers = await ethers.getSigners();
    const ownerAddr = signers[0].address;
    const { owner, projectWallet, buyer, presale, bht, nft, price } = await deployPresale({ bhtFactory: 'contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse', bhtArgs: ['MockBHT', 'MBHT', ownerAddr] });
    // configure operations wallet
    await presale.connect(owner).setOperationsWallet(owner.address);
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    await presale.connect(owner).setDiscountBps(0);
    await presale.connect(owner).setBurnBps(500);

    // fund buyer with tokens and set allowance; ensure presale has NFTs
    await bht.mint(buyer.address, ethers.parseUnits('1000', 18));
  const presaleAddr = (typeof presale.getAddress === 'function') ? await presale.getAddress() : (presale.address || presale.target);
  await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits('1000', 18));
  try { await nft.mint(presaleAddr, 1, 10); } catch (e) { /* ignore */ }

    // set price fresh and ensure calculation works
    await setPriceFresh(price, ethers.parseUnits('1', 8));

    // call payServiceWithBHT (numeric overload) to hit burn fallback and ops transfer path
    const fiat = ethers.parseUnits('10', 18);
  // since MockBHTReturnFalse returns false when transferring to ownerAddr (ops), the ops transfer should fail
  await expect(presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](1, fiat)).to.be.revertedWith('Ops transfer failed');
  });

  it('delegate rescue functions propagate revert reasons and no-reason branches', async function () {
    const { owner, projectWallet, buyer, presale, bht, nft, price, referral } = await deployPresale();
    // deploy mocks that revert with and without reason
    const MockRescueWith = await ethers.getContractFactory('contracts/mocks/MockRescueRevertWithReason.sol:MockRescueRevertWithReason');
    const MockRescueNo = await ethers.getContractFactory('contracts/mocks/MockRescueRevertNoReason.sol:MockRescueRevertNoReason');
    const withMock = await MockRescueWith.deploy(); await withMock.waitForDeployment();
    const noMock = await MockRescueNo.deploy(); await noMock.waitForDeployment();

  // set rescueContract to withMock and call delegateRescueUnsoldNfts (expect revert with prefixed message + reason)
  const withMockAddr = (typeof withMock.getAddress === 'function') ? await withMock.getAddress() : (withMock.address || withMock.target);
  await presale.connect(owner).setRescueContract(withMockAddr);
  await expect(presale.connect(owner).delegateRescueUnsoldNfts(1, projectWallet.address, 1)).to.be.revertedWith('Delegate rescue NFT failed: boom');

    // set rescueContract to noMock and expect generic revert
  const noMockAddr = (typeof noMock.getAddress === 'function') ? await noMock.getAddress() : (noMock.address || noMock.target);
  await presale.connect(owner).setRescueContract(noMockAddr);
    await expect(presale.connect(owner).delegateRescueUnsoldNfts(1, projectWallet.address, 1)).to.be.revertedWith('Delegate rescue NFT failed');

    // delegate emergency withdraw and rescue ERC20 similar flows
  await presale.connect(owner).setRescueContract(withMockAddr);
  await expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed: eth-boom');
  await presale.connect(owner).setRescueContract(noMockAddr);
    await expect(presale.connect(owner).delegateEmergencyWithdrawEth()).to.be.revertedWith('Delegate rescue ETH failed');
  });
});
