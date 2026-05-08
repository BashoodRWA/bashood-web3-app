if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { deployPresale, setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - payServiceWithBHT", function () {
  let deployer, user, admin, priceFeed, BashoodToken, bashoodToken, BashoodPresaleFinal, presale;
  const serviceId = ethers.id("service-001");
  const fiatQuoteUsd = ethers.parseUnits("100", 18); // $100

  beforeEach(async function () {
    [deployer, user, admin] = await ethers.getSigners();
    // use centralized helper to deploy presale reliably
    const helpers = getPresaleHelpers();
    const d = await helpers.deployPresale({});
    presale = d.presale;
    bashoodToken = d.bht;
    priceFeed = d.price;
    // ensure admin/signers mapping used in tests
    await presale.connect(deployer).grantRole(await presale.ADMIN_ROLE(), await deployer.getAddress());
    await presale.connect(deployer).setSigner(await deployer.getAddress());
    await presale.connect(deployer).setOperationsWallet(await admin.getAddress());
    // Grant ADMIN_ROLE first, then call admin-only setters in predictable order
  await presale.connect(deployer).grantRole(await presale.ADMIN_ROLE(), await deployer.getAddress());
  await presale.connect(deployer).setSigner(await deployer.getAddress());
  await presale.connect(deployer).setOperationsWallet(await admin.getAddress());
  if (presale.setPriceFeed) await presale.connect(deployer).setPriceFeed(await priceFeed.getAddress());
    await presale.connect(deployer).setDiscountBps(1000);
    await presale.connect(deployer).setBurnBps(500);
    if (presale.setMaxPriceStaleness) await presale.connect(deployer).setMaxPriceStaleness(120);
    // align block timestamp to presale window then start
    const presaleStart = await presale.presaleStart();
    let blockBefore = await ethers.provider.getBlock("latest");
    let nextTimestamp = Math.max(Number(presaleStart) + 1, blockBefore.timestamp + 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await ethers.provider.send("evm_mine");
    await presale.connect(deployer).startPresale();
    // Ensure price feed shows a fresh updatedAt so BHT calculations don't revert
    // Use centralized helper to set both answer and timestamp consistently
    if (typeof setPriceFresh === 'function') {
      await setPriceFresh(priceFeed, ethers.parseUnits('1', 8));
    } else if (priceFeed.setUpdatedAt) {
      await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp);
      await ethers.provider.send("evm_mine");
    }
    // Mint and approve BHT (very large allowance to avoid ERC20InsufficientAllowance in tests)
    await bashoodToken.mint(user.address, ethers.parseUnits("1000000000000", 18));
  await bashoodToken.connect(user).approve(await presale.getAddress(), ethers.parseUnits("1000000000000", 18));
  });

  it("permite pagar un servicio con BHT y emite BHTBurned", async function () {
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.emit(presale, "BHTBurned");
  });

  it("revierta si el oráculo está stale", async function () {
    await priceFeed.setUpdatedAt((await ethers.provider.getBlock("latest")).timestamp - 1000);
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.be.revertedWith("Price too stale");
  });

  it("revierta si el descuento supera el cap", async function () {
    await presale.connect(deployer).setDiscountBps(3000); // >20%
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.be.revertedWith("Discount cap");
  });

  it("revierta si la quema supera el cap", async function () {
    await presale.connect(deployer).setBurnBps(2000); // >15%
    await expect(
  presale.connect(user)["payServiceWithBHT(uint256,uint256)"](serviceId, fiatQuoteUsd)
    ).to.be.revertedWith("Burn cap");
  });
});
 
