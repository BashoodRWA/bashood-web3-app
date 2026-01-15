// rely on test/setup.js singletons when available; fall back to lazy require
const expect = (globalThis._chai_expect || require('chai').expect);
const ethers = globalThis.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh } = getPresaleHelpers();

describe('BashoodPresaleFinal - extra critical branches', function () {
  this.timeout(200000);
  let owner;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
  });

  it('submitProposal reverts when burnFrom absent and transfer to dead returns false', async function () {
    const { owner: ownerOut, projectWallet, buyer, presale, bht, price } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse',
      bhtArgs: ['MockBHT', 'MBHT', await owner.getAddress()]
    });

    // configure presale essentials
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
  await presale.connect(owner).setPriceFeed(await price.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(1000);
  await setPriceFresh(price, ethers.parseUnits('1', 8));

    // make burn fallback fail: transferFrom to dead will return false
    const dead = '0x000000000000000000000000000000000000dEaD';
    await bht.setRejectTo(dead);

    const deposit = ethers.parseUnits('1', 18);
    // ensure buyer has BHT and approved presale
    await bht.mint(buyer.address, deposit);
  await bht.connect(buyer).approve(await presale.getAddress(), deposit);
  // ensure presale has NFT stock
  try { await nft.mint(await presale.getAddress(), 1, 10); } catch (e) { /* ignore */ }

    await expect(presale.connect(buyer).submitProposal('0x1234', deposit)).to.be.revertedWith('Burn transfer failed');
  });

  it('payServiceWithBHT reverts when ops transfer fails after burn fallback', async function () {
    const { owner: ownerOut, projectWallet, buyer, presale, bht, price } = await deployPresale({
      bhtFactory: 'contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse',
      bhtArgs: ['MockBHT', 'MBHT', owner.address]
    });

    // configure presale essentials
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
  const priceAddr = (typeof price.getAddress === 'function') ? await price.getAddress() : (price.address || price.target);
  await presale.connect(owner).setPriceFeed(priceAddr);
    await presale.connect(owner).setMaxPriceStaleness(1000);
    // enable a small burn to have both burnAmount and opsAmount > 0
    await presale.connect(owner).setBurnBps(100);
    await setPriceFresh(price, ethers.parseUnits('1', 8));

    // make ops transfer fail by rejecting transfers to operationsWallet
    await bht.setRejectTo(projectWallet.address);

    const big = ethers.parseUnits('1000', 18);
    await bht.mint(buyer.address, big);
  await bht.connect(buyer).approve(await presale.getAddress(), big);

    const fiat = ethers.parseUnits('10', 18);
    await expect(presale.connect(buyer)['payServiceWithBHT(uint256,uint256)'](1, fiat)).to.be.revertedWith('Ops transfer failed');
  });
});






