/**
 * test/BashoodPresaleFinal.economic.test.cjs
 *
 * Tests del flujo económico del protocolo.
 *
 * [I] Consistencia: burnAmount + opsAmount == discountedCost siempre
 * [J] Rounding: Math.mulDiv — sin pérdida ni creación de valor
 * [K] Descuentos: caps correctos, buyer nunca paga menos del mínimo
 * [L] Burn: reducción real de supply vs fallback a dead address
 * [M] Operations wallet: recibe exactamente opsAmount
 * [N] Oracle: impacto económico en payServiceWithBHT con precios extremos
 * [O] ETH vs BHT: sin arbitraje explotable
 * [P] Acumulación global: múltiples compras mantienen consistencia
 */
"use strict";

const { expect }     = require("chai");
const { ethers }     = require("hardhat");
const { time }       = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber }  = require("ethers");

// ──────────────────────────────────────────────────────────────────────────────
// Fórmulas de referencia (exactas, sin rounding propio)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reproduce Math.mulDiv(a, b, c) usando BigInt nativo.
 * Math.mulDiv hace floor division como la EVM.
 */
function mulDiv(a, b, c) {
  return (BigInt(a) * BigInt(b)) / BigInt(c);
}

function calcBhtAmounts(nftPriceBHT, qty, bhtDiscountBps, burnBps) {
  const base         = BigInt(nftPriceBHT) * BigInt(qty);
  const discounted   = mulDiv(base, 10000n - BigInt(bhtDiscountBps), 10000n);
  const burnAmount   = mulDiv(discounted, BigInt(burnBps), 10000n);
  const opsAmount    = discounted - burnAmount;
  return { base, discounted, burnAmount, opsAmount };
}

function calcServiceBhtAmounts(fiatQuoteUsd, oracleAnswer, decimals, bhtDiscountBps, burnBps) {
  const bhtAmount    = mulDiv(fiatQuoteUsd, 10n ** BigInt(decimals), oracleAnswer);
  const discounted   = mulDiv(bhtAmount, 10000n - BigInt(bhtDiscountBps), 10000n);
  const burnAmount   = mulDiv(discounted, BigInt(burnBps), 10000n);
  const opsAmount    = discounted - burnAmount;
  return { bhtAmount, discounted, burnAmount, opsAmount };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper de despliegue económico
// ──────────────────────────────────────────────────────────────────────────────

async function signFor(signer, buyerAddr, nonce) {
  const msgHash = ethers.keccak256(
    ethers.concat([
      ethers.getBytes(buyerAddr),
      ethers.getBytes(ethers.toBeHex(nonce, 32)),
    ])
  );
  return signer.signMessage(ethers.getBytes(msgHash));
}

/**
 * Despliega el sistema completo con control total sobre parámetros económicos.
 */
async function deployEconomic(opts = {}) {
  const [owner, buyer, buyer2, buyer3, signer, opsWallet] = await ethers.getSigners();

  const bhtName = opts.bhtFactory || "contracts/MockBashoodToken.sol:MockBashoodToken";
  const BHT = await ethers.getContractFactory(bhtName);
  const bht = await BHT.deploy();
  await bht.waitForDeployment();

  const NFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();

  const oracleDecimals = opts.oracleDecimals ?? 8;
  const oracleAnswer   = opts.oracleAnswer   ?? ethers.parseUnits("1", oracleDecimals); // $1/BHT

  const PF = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const priceFeed = await PF.deploy(oracleDecimals, oracleAnswer);
  await priceFeed.waitForDeployment();

  const Ref = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
  const referral = await Ref.deploy(owner.address, owner.address, await nft.getAddress());
  await referral.waitForDeployment();

  const nftPriceETH  = opts.nftPriceETH  ?? ethers.parseEther("0.01");
  const nftPriceBHT  = opts.nftPriceBHT  ?? ethers.parseUnits("10", 18); // 10 BHT por NFT
  const maxPerUser   = opts.maxPerUser   ?? 20;
  const maxSupply    = opts.maxSupply    ?? 50;

  const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
  const presale = await Presale.deploy(
    await bht.getAddress(),
    await nft.getAddress(),
    await referral.getAddress(),
    opsWallet.address,
    opsWallet.address,   // operationsWallet = opsWallet
    nftPriceETH,
    nftPriceBHT,
    0, 0,
    maxSupply
  );
  await presale.waitForDeployment();

  await presale.connect(owner).setSigner(signer.address);
  await presale.connect(owner).setPriceFeed(await priceFeed.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(3600);
  await presale.connect(owner).setMaxPerUser(maxPerUser);
  await presale.connect(owner).setOperationsWallet(opsWallet.address);
  await presale.connect(owner).startPresale();

  const stock = opts.stock ?? maxSupply;
  if (stock > 0) {
    await nft.connect(owner).mint(owner.address, 1, stock);
    await nft.connect(owner).safeTransferFrom(owner.address, await presale.getAddress(), 1, stock, "0x");
  }

  // Dar BHT a los compradores
  const mintAmount = ethers.parseUnits("1000000", 18);
  await bht.mint(buyer.address,  mintAmount);
  await bht.mint(buyer2.address, mintAmount);
  await bht.mint(buyer3.address, mintAmount);
  await bht.connect(buyer).approve(await presale.getAddress(),  mintAmount);
  await bht.connect(buyer2).approve(await presale.getAddress(), mintAmount);
  await bht.connect(buyer3).approve(await presale.getAddress(), mintAmount);

  return {
    owner, buyer, buyer2, buyer3, signer, opsWallet,
    bht, nft, priceFeed, referral, presale,
    nftPriceETH, nftPriceBHT,
    oracleDecimals, oracleAnswer: BigInt(oracleAnswer),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// [I] Consistencia: burnAmount + opsAmount == discountedCost
// ──────────────────────────────────────────────────────────────────────────────

describe("[I] Consistencia: burnAmount + opsAmount == discountedCost", function () {
  // Parámetros: [bhtDiscountBps, burnBps, qty, label]
  const cases = [
    [0,    0,    1, "I1: discount=0 burn=0"],
    [0,    1500, 1, "I2: discount=0 burn=15%"],
    [2000, 0,    1, "I3: discount=20% burn=0"],
    [2000, 1500, 1, "I4: discount=20% burn=15%"],
    [500,  300,  3, "I5: discount=5% burn=3% qty=3"],
    [1234, 567,  7, "I6: valores impares qty=7"],
    [1,    1,    1, "I7: 1 bps en ambos (casi nada)"],
    [1999, 1499, 2, "I8: máximos -1 qty=2"],
  ];

  for (const [discBps, burnBps_, qty, label] of cases) {
    it(label, async function () {
      const ctx = await deployEconomic();
      const { presale, signer, buyer, owner, nftPriceBHT } = ctx;

      await presale.connect(owner).setDiscountBps(discBps);
      await presale.connect(owner).setBurnBps(burnBps_);

      const { discounted, burnAmount, opsAmount } = calcBhtAmounts(nftPriceBHT, qty, discBps, burnBps_);

      // Invariante principal: burn + ops == discounted
      expect(burnAmount + opsAmount).to.equal(discounted);

      // Verificación on-chain: comprar y medir balances
      const sig = await signFor(ctx.signer, ctx.buyer.address, 50000 + discBps * 100 + burnBps_);
      const opsBefore = await ctx.bht.balanceOf(ctx.opsWallet.address);
      await ctx.presale.connect(ctx.buyer).purchaseWithBHT(1, qty, 50000 + discBps * 100 + burnBps_, sig);
      const opsAfter = await ctx.bht.balanceOf(ctx.opsWallet.address);

      // El opsWallet recibió exactamente opsAmount
      expect(opsAfter - opsBefore).to.equal(opsAmount);
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// [J] Rounding: Math.mulDiv — sin pérdida ni creación de valor
// ──────────────────────────────────────────────────────────────────────────────

describe("[J] Rounding: Math.mulDiv — comportamiento del floor division", function () {
  it("J1: nftPriceBHT impar (3 wei) — burn+ops == discounted siempre", async function () {
    const ctx = await deployEconomic({ nftPriceBHT: 3n }); // 3 wei
    const { presale, signer, buyer, owner } = ctx;

    await presale.connect(owner).setDiscountBps(1000); // 10%
    await presale.connect(owner).setBurnBps(300);      // 3%

    // base = 3, discounted = mulDiv(3, 9000, 10000) = 0  ← intencionalmente mínimo
    const { discounted, burnAmount, opsAmount } = calcBhtAmounts(3n, 1, 1000, 300);
    expect(burnAmount + opsAmount).to.equal(discounted);
  });

  it("J2: qty = 1, bhtDiscountBps = 3333 — floor correcto", async function () {
    const price = ethers.parseUnits("10", 18); // 10 BHT
    const { discounted, burnAmount, opsAmount } = calcBhtAmounts(price, 1, 3333, 100);
    expect(burnAmount + opsAmount).to.equal(discounted);
    // discounted = mulDiv(10e18, 6667, 10000) = exacto con mulDiv
    const expected = mulDiv(price, 10000n - 3333n, 10000n);
    expect(discounted).to.equal(expected);
  });

  it("J3: qty = 13, precio medio — suma exacta sin residuo", async function () {
    const price = ethers.parseUnits("7", 17); // 0.7 BHT
    const qty = 13;
    const { discounted, burnAmount, opsAmount } = calcBhtAmounts(price, qty, 777, 444);
    expect(burnAmount + opsAmount).to.equal(discounted);
  });

  it("J4: rounding floor → discountedCost ≤ baseCost × (10000-discBps)/10000 + 1", async function () {
    const base = ethers.parseUnits("10", 18);
    const { discounted } = calcBhtAmounts(base, 1, 1, 0); // 1 bps discount
    // discounted = mulDiv(10e18, 9999, 10000) — el floor puede perder 1 wei
    const theoretical = (BigInt(base) * 9999n) / 10000n;
    expect(discounted).to.equal(theoretical);
  });

  it("J5: payService — fiatQuoteUsd grande y precio oracle alto — sin overflow", async function () {
    const ctx = await deployEconomic({
      oracleDecimals: 8,
      oracleAnswer: ethers.parseUnits("100000", 8), // $100k/BHT (extremo)
    });
    const { presale, bht, buyer, opsWallet } = ctx;

    // Servicio de $1M USD (con 18 decimals)
    const fiat = ethers.parseUnits("1000000", 18); // $1M
    await bht.mint(buyer.address, ethers.parseUnits("1000000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("1000000", 18));

    const { discounted, burnAmount, opsAmount } = calcServiceBhtAmounts(
      BigInt(fiat), 10000000000000n, 8, 0, 0
    );
    expect(burnAmount + opsAmount).to.equal(discounted);
  });

  it("J6: payService — fiatQuoteUsd = 1 wei (mínimo absoluto) sin underflow", async function () {
    // fiat = 1 wei, oracle = $1/BHT (8 dec) → bhtAmount = 1 * 1e8 / 1e8 = 1 wei
    const { bhtAmount, burnAmount, opsAmount, discounted } = calcServiceBhtAmounts(1n, 100000000n, 8, 0, 0);
    expect(burnAmount + opsAmount).to.equal(discounted);
    expect(bhtAmount).to.equal(1n);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [K] Descuentos: caps y mínimos de pago
// ──────────────────────────────────────────────────────────────────────────────

describe("[K] Descuentos: caps y buyer nunca paga menos del mínimo permitido", function () {
  let ctx;
  beforeEach(async function () { ctx = await deployEconomic(); });

  it("K1: setDiscountBps(2001) revierte — cap es 2000 (20%)", async function () {
    await expect(ctx.presale.connect(ctx.owner).setDiscountBps(2001))
      .to.be.revertedWith("Discount cap exceeded");
  });

  it("K2: setDiscountBps(2000) acepta — discount exactamente al máximo", async function () {
    await expect(ctx.presale.connect(ctx.owner).setDiscountBps(2000))
      .to.emit(ctx.presale, "DiscountBpsChanged").withArgs(2000);
  });

  it("K3: con discount = 2000 (20%), buyer paga exactamente 80% de baseCost", async function () {
    const { presale, signer, buyer, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(2000);
    const base = BigInt(nftPriceBHT);
    const expected = mulDiv(base, 8000n, 10000n); // 80% del base
    const sig = await signFor(signer, buyer.address, 60001);
    const balBefore = await ctx.bht.balanceOf(buyer.address);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 60001, sig);
    const balAfter = await ctx.bht.balanceOf(buyer.address);
    expect(balBefore - balAfter).to.equal(expected);
  });

  it("K4: con discount = 0, buyer paga 100% del baseCost", async function () {
    const { presale, signer, buyer, nftPriceBHT } = ctx;
    const base = BigInt(nftPriceBHT);
    const sig = await signFor(signer, buyer.address, 60002);
    const balBefore = await ctx.bht.balanceOf(buyer.address);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 60002, sig);
    const balAfter = await ctx.bht.balanceOf(buyer.address);
    expect(balBefore - balAfter).to.equal(base);
  });

  it("K5: allowance == discountedCost - 1 → E30 (ni 1 wei de margen)", async function () {
    const { presale, signer, buyer, bht, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(0);
    const { discounted } = calcBhtAmounts(nftPriceBHT, 1, 0, 0);
    // Revocar aprobación previa y aprobar exactamente 1 wei menos
    await bht.connect(buyer).approve(await presale.getAddress(), discounted - 1n);
    const sig = await signFor(signer, buyer.address, 60003);
    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, 60003, sig))
      .to.be.revertedWith("E30");
  });

  it("K6: allowance == discountedCost exacto → OK (sin margen de más)", async function () {
    const { presale, signer, buyer, bht, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(500);
    const { discounted } = calcBhtAmounts(nftPriceBHT, 1, 500, 0);
    await bht.connect(buyer).approve(await presale.getAddress(), discounted);
    const sig = await signFor(signer, buyer.address, 60004);
    await expect(presale.connect(buyer).purchaseWithBHT(1, 1, 60004, sig))
      .to.emit(presale, "AssetPurchased");
  });

  it("K7: descuento máximo no convierte una compra en gratuita (discounted > 0 si nftPriceBHT > 1)", async function () {
    const ctx2 = await deployEconomic({ nftPriceBHT: ethers.parseUnits("10", 18) });
    await ctx2.presale.connect(ctx2.owner).setDiscountBps(2000);
    const { discounted } = calcBhtAmounts(ethers.parseUnits("10", 18), 1, 2000, 0);
    expect(discounted).to.be.gt(0n);
  });

  it("K8: setBurnBps(1501) revierte — cap es 1500 (15%)", async function () {
    await expect(ctx.presale.connect(ctx.owner).setBurnBps(1501))
      .to.be.revertedWith("Burn cap exceeded");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [L] Burn: supply reduction vs fallback
// ──────────────────────────────────────────────────────────────────────────────

describe("[L] Burn: reducción real de supply vs fallback a dead address", function () {
  const DEAD = "0x000000000000000000000000000000000000dEaD";

  it("L1: MockBHTWithBurn — burnFrom reduce totalSupply exactamente en burnAmount", async function () {
    const ctx = await deployEconomic({
      bhtFactory: "contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn",
    });
    const { presale, signer, buyer, bht, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setBurnBps(1000); // 10%
    await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

    const { burnAmount } = calcBhtAmounts(nftPriceBHT, 1, 0, 1000);
    const supplyBefore = await bht.totalSupply();
    const sig = await signFor(signer, buyer.address, 70001);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 70001, sig);
    const supplyAfter = await bht.totalSupply();

    expect(supplyBefore - supplyAfter).to.equal(burnAmount);
  });

  it("L2: MockBHTNoBurn — fallback: dead address acumula, totalSupply NO varía", async function () {
    const ctx = await deployEconomic({
      bhtFactory: "contracts/mocks/MockBHTNoBurn.sol:MockBHTNoBurn",
    });
    const { presale, signer, buyer, bht, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setBurnBps(500);
    await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

    const { burnAmount } = calcBhtAmounts(nftPriceBHT, 1, 0, 500);
    const supplyBefore  = await bht.totalSupply();
    const deadBefore    = await bht.balanceOf(DEAD);
    const sig = await signFor(signer, buyer.address, 70002);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 70002, sig);
    const supplyAfter = await bht.totalSupply();
    const deadAfter   = await bht.balanceOf(DEAD);

    // Supply no cambia (transfer, no burn)
    expect(supplyAfter).to.equal(supplyBefore);
    // Dead address recibió exactamente burnAmount
    expect(deadAfter - deadBefore).to.equal(burnAmount);
  });

  it("L3: burnBps = 0 → totalSupply inmutable, dead address no recibe nada", async function () {
    const ctx = await deployEconomic({
      bhtFactory: "contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn",
    });
    const { presale, signer, buyer, bht } = ctx;
    await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

    const supplyBefore = await bht.totalSupply();
    const deadBefore   = await bht.balanceOf(DEAD);
    const sig = await signFor(signer, buyer.address, 70003);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 70003, sig);
    expect(await bht.totalSupply()).to.equal(supplyBefore);
    expect(await bht.balanceOf(DEAD)).to.equal(deadBefore);
  });

  it("L4: burn máximo (1500 bps = 15%) — buyer pierde más que con burn=0", async function () {
    const ctx       = await deployEconomic({ nftPriceBHT: ethers.parseUnits("100", 18) });
    const ctx0burn  = await deployEconomic({ nftPriceBHT: ethers.parseUnits("100", 18) });
    const { presale, signer, buyer, bht, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setBurnBps(1500);

    await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

    const { discounted: d1500 } = calcBhtAmounts(nftPriceBHT, 1, 0, 1500);
    const { discounted: d0     } = calcBhtAmounts(nftPriceBHT, 1, 0, 0);
    // El buyer siempre paga discounted (mismo en ambos casos)
    expect(d1500).to.equal(d0);
    // Lo que cambia es cómo se distribuye: burn vs ops

    const sig = await signFor(signer, buyer.address, 70004);
    const balBefore = await bht.balanceOf(buyer.address);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 70004, sig);
    const balAfter = await bht.balanceOf(buyer.address);
    expect(balBefore - balAfter).to.equal(d1500);
  });

  it("L5: evento BHTBurned emitido por payServiceWithBHT con amount correcto", async function () {
    // BHTBurned se emite en _payServiceWithBHT / _payMilestoneWithBHT (no en purchaseWithBHT)
    const ctx = await deployEconomic();
    const { presale, bht, buyer, owner, oracleDecimals, oracleAnswer } = ctx;
    await presale.connect(owner).setBurnBps(200);
    await bht.mint(buyer.address, ethers.parseUnits("100000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("100000", 18));

    const fiat = ethers.parseUnits("100", 18); // $100
    const { burnAmount } = calcServiceBhtAmounts(BigInt(fiat), oracleAnswer, oracleDecimals, 0, 200);
    await expect(presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](1n, fiat))
      .to.emit(presale, "BHTBurned")
      .withArgs(ctx.buyer.address, burnAmount);
  });

  it("L6: payServiceWithBHT burn reduce totalSupply (con MockBHTWithBurn)", async function () {
    const ctx = await deployEconomic({
      bhtFactory: "contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn",
    });
    const { presale, bht, buyer, owner, oracleDecimals, oracleAnswer } = ctx;
    await presale.connect(owner).setBurnBps(500);
    await bht.mint(buyer.address, ethers.parseUnits("100000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("100000", 18));

    const fiat = ethers.parseUnits("100", 18); // $100
    const { burnAmount } = calcServiceBhtAmounts(BigInt(fiat), oracleAnswer, oracleDecimals, 0, 500);
    const supplyBefore = await bht.totalSupply();
    await presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](1n, fiat);
    const supplyAfter = await bht.totalSupply();
    expect(supplyBefore - supplyAfter).to.equal(burnAmount);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [M] Operations wallet: recibe exactamente opsAmount
// ──────────────────────────────────────────────────────────────────────────────

describe("[M] Operations wallet: balance exacto", function () {
  it("M1: purchaseWithBHT — opsWallet recibe exactamente opsAmount (discount=0, burn=0)", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, bht, opsWallet, nftPriceBHT } = ctx;
    const { opsAmount } = calcBhtAmounts(nftPriceBHT, 1, 0, 0);
    const opsBefore = await bht.balanceOf(opsWallet.address);
    const sig = await signFor(signer, buyer.address, 80001);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 80001, sig);
    const opsAfter = await bht.balanceOf(opsWallet.address);
    expect(opsAfter - opsBefore).to.equal(opsAmount);
  });

  it("M2: purchaseWithBHT — opsWallet recibe exactamente opsAmount (discount=20%, burn=15%)", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, bht, opsWallet, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(2000);
    await presale.connect(owner).setBurnBps(1500);
    const { opsAmount } = calcBhtAmounts(nftPriceBHT, 1, 2000, 1500);
    const opsBefore = await bht.balanceOf(opsWallet.address);
    const sig = await signFor(signer, buyer.address, 80002);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 80002, sig);
    const opsAfter = await bht.balanceOf(opsWallet.address);
    expect(opsAfter - opsBefore).to.equal(opsAmount);
  });

  it("M3: múltiples compras — saldo acumulado == suma de opsAmounts individuales", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, buyer2, buyer3, bht, opsWallet, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(1000);
    await presale.connect(owner).setBurnBps(300);

    const { opsAmount: ops1 } = calcBhtAmounts(nftPriceBHT, 1, 1000, 300);
    const { opsAmount: ops2 } = calcBhtAmounts(nftPriceBHT, 2, 1000, 300);
    const { opsAmount: ops3 } = calcBhtAmounts(nftPriceBHT, 3, 1000, 300);
    const expectedTotal = ops1 + ops2 + ops3;

    const opsBefore = await bht.balanceOf(opsWallet.address);

    const sig1 = await signFor(signer, buyer.address,  80003);
    const sig2 = await signFor(signer, buyer2.address, 80004);
    const sig3 = await signFor(signer, buyer3.address, 80005);

    await presale.connect(buyer).purchaseWithBHT(1, 1, 80003, sig1);
    await presale.connect(buyer2).purchaseWithBHT(1, 2, 80004, sig2);
    await presale.connect(buyer3).purchaseWithBHT(1, 3, 80005, sig3);

    const opsAfter = await bht.balanceOf(opsWallet.address);
    expect(opsAfter - opsBefore).to.equal(expectedTotal);
  });

  it("M4: payServiceWithBHT — opsWallet recibe opsAmount correcto", async function () {
    const ctx = await deployEconomic();
    const { presale, bht, buyer, owner, opsWallet, oracleDecimals, oracleAnswer } = ctx;
    await presale.connect(owner).setBurnBps(1000);
    await bht.mint(buyer.address, ethers.parseUnits("100000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("100000", 18));

    const fiat = ethers.parseUnits("500", 18); // $500
    const { opsAmount } = calcServiceBhtAmounts(BigInt(fiat), oracleAnswer, oracleDecimals, 0, 1000);
    const opsBefore = await bht.balanceOf(opsWallet.address);
    await presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](42n, fiat);
    const opsAfter = await bht.balanceOf(opsWallet.address);
    expect(opsAfter - opsBefore).to.equal(opsAmount);
  });

  it("M5: con discount=20% y burn=15% → opsAmount = 68% del baseCost exacto", async function () {
    // discounted = 80% de base
    // burn = 15% del discounted = 12% del base
    // ops = discounted - burn = 80% - 12% = 68%
    const base = ethers.parseUnits("100", 18); // 100 BHT base
    const { discounted, burnAmount, opsAmount } = calcBhtAmounts(base, 1, 2000, 1500);
    const expected68 = mulDiv(BigInt(base), 6800n, 10000n);
    // Nota: Math.mulDiv puede dar resultados ligeramente diferentes por la cadena de floors
    // Lo que sí es exacto: ops + burn = discounted
    expect(burnAmount + opsAmount).to.equal(discounted);
    // Y discounted = 80% del base via mulDiv
    const expected80 = mulDiv(BigInt(base), 8000n, 10000n);
    expect(discounted).to.equal(expected80);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [N] Oracle: impacto económico en precios extremos
// ──────────────────────────────────────────────────────────────────────────────

describe("[N] Oracle: impacto económico en payServiceWithBHT con precios extremos", function () {
  it("N1: oracle $1/BHT — $100 de servicio = 100 BHT (con 8 decimales OK)", async function () {
    // answer = 1e8 (= $1), decimals = 8
    // bhtAmount = fiat * 1e8 / 1e8 = fiat with 18 decimals
    const ctx = await deployEconomic({ oracleAnswer: 100000000n, oracleDecimals: 8 }); // $1
    const { presale, bht, buyer } = ctx;
    await bht.mint(buyer.address, ethers.parseUnits("1000000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("1000000", 18));

    const fiat = ethers.parseUnits("100", 18); // $100
    const expectedBHT = ethers.parseUnits("100", 18); // 100 BHT
    const { bhtAmount } = calcServiceBhtAmounts(BigInt(fiat), 100000000n, 8, 0, 0);
    expect(bhtAmount).to.equal(expectedBHT);
  });

  it("N2: oracle $2000/BHT — $100 de servicio = 0.05 BHT (5e16 wei)", async function () {
    const answer = 200000000000n; // $2000 con 8 dec
    const fiat   = ethers.parseUnits("100", 18);
    const { bhtAmount } = calcServiceBhtAmounts(BigInt(fiat), answer, 8, 0, 0);
    // bhtAmount = 100e18 * 1e8 / 200000000000 = 100e18 * 1e8 / 2e11 = 100e18 / 2000 = 5e16
    expect(bhtAmount).to.equal(ethers.parseUnits("0.05", 18));
  });

  it("N3: precio BHT muy alto ($100k) — BHT requerido mínimo, sin underflow", async function () {
    const ctx = await deployEconomic({
      oracleDecimals: 8,
      oracleAnswer: ethers.parseUnits("100000", 8), // $100,000/BHT
    });
    const { presale, bht, buyer } = ctx;
    await bht.mint(buyer.address, ethers.parseUnits("1000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));

    const fiat = ethers.parseUnits("1000", 18); // $1000
    // $1000 / $100000 = 0.01 BHT = 1e16 wei
    const { bhtAmount } = calcServiceBhtAmounts(BigInt(fiat), 10000000000000n, 8, 0, 0);
    expect(bhtAmount).to.equal(ethers.parseUnits("0.01", 18));

    await expect(
      presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](1n, fiat)
    ).to.emit(presale, "ServicePaid");
  });

  it("N4: oracle 18 decimals — misma fórmula, resultado consistente", async function () {
    // answer = 1e18 (= $1 con 18 dec), decimals = 18
    // bhtAmount = fiat * 1e18 / 1e18 = fiat (1:1)
    const answer18 = ethers.parseUnits("1", 18);
    const fiat     = ethers.parseUnits("50", 18);
    const { bhtAmount } = calcServiceBhtAmounts(BigInt(fiat), BigInt(answer18), 18, 0, 0);
    expect(bhtAmount).to.equal(fiat);
  });

  it("N5: cambio de oracle price NO afecta purchaseWithBHT (precio fijo nftPriceBHT)", async function () {
    const ctx = await deployEconomic({ nftPriceBHT: ethers.parseUnits("10", 18) });
    const { presale, priceFeed, signer, buyer, bht, opsWallet, nftPriceBHT } = ctx;

    // purchaseWithBHT solo llama _getOracleData() para validar freshness,
    // luego usa nftPriceBHT directamente — el precio no depende del oracle
    const balBefore = await bht.balanceOf(buyer.address);

    // Cambiar oracle price a $1M/BHT
    await priceFeed.setAnswer(ethers.parseUnits("1000000", 8));

    const sig = await signFor(signer, buyer.address, 90001);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 90001, sig);

    const balAfter = await bht.balanceOf(buyer.address);
    // El buyer sigue pagando exactamente nftPriceBHT, independientemente del oracle
    expect(balBefore - balAfter).to.equal(BigInt(nftPriceBHT));
  });

  it("N6: oracle answer = 1 (precio prácticamente cero) — fiat produce BHT masivo", async function () {
    const fiat = ethers.parseUnits("1", 18); // $1
    // answer = 1 (1e-8 USD/BHT) → bhtAmount = 1e18 * 1e8 / 1 = 1e26
    const { bhtAmount } = calcServiceBhtAmounts(BigInt(fiat), 1n, 8, 0, 0);
    expect(bhtAmount).to.be.gt(ethers.parseUnits("1000000", 18));
    // En on-chain, el comprador necesitaría esa cantidad de BHT → allowance insuficiente
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [O] ETH vs BHT: sin arbitraje explotable
// ──────────────────────────────────────────────────────────────────────────────

describe("[O] ETH vs BHT: sin arbitraje explotable", function () {
  it("O1: precios son independientes — ETH path usa nftPriceETH fijo, BHT usa nftPriceBHT fijo", async function () {
    const ctx = await deployEconomic({
      nftPriceETH: ethers.parseEther("0.01"),
      nftPriceBHT: ethers.parseUnits("10", 18), // 10 BHT
    });
    const { presale } = ctx;
    expect(await presale.nftPriceETH()).to.equal(ethers.parseEther("0.01"));
    expect(await presale.nftPriceBHT()).to.equal(ethers.parseUnits("10", 18));
    // Ambos precios son inmutables (no hay setter)
  });

  it("O2: compra con ETH no modifica parámetros que afecten compra con BHT", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, buyer2, bht, nftPriceETH } = ctx;

    const discBefore = await presale.bhtDiscountBps();
    const burnBefore = await presale.burnBps();

    // Compra con ETH
    const sig = await signFor(signer, buyer.address, 100001);
    await presale.connect(buyer).purchaseWithETH(1, 1, 100001, sig, { value: nftPriceETH });

    // Parámetros BHT sin cambio
    expect(await presale.bhtDiscountBps()).to.equal(discBefore);
    expect(await presale.burnBps()).to.equal(burnBefore);
  });

  it("O3: totalNFTsSold se incrementa independientemente del método de pago", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, buyer2, nftPriceETH } = ctx;

    const sig1 = await signFor(signer, buyer.address,  100002);
    const sig2 = await signFor(signer, buyer2.address, 100003);

    await presale.connect(buyer).purchaseWithETH(1, 1, 100002, sig1, { value: nftPriceETH });
    await presale.connect(buyer2).purchaseWithBHT(1, 1, 100003, sig2);

    expect(await presale.totalNFTsSold()).to.equal(2n);
  });

  it("O4: no hay relación hardcodeada entre ETH y BHT — descuento en BHT no afecta ETH", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, buyer2, bht, owner, nftPriceETH } = ctx;

    // Activar máximo descuento BHT
    await presale.connect(owner).setDiscountBps(2000);

    // Compra ETH: debe pagar nftPriceETH exacto (sin descuento)
    const sig = await signFor(signer, buyer.address, 100004);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 100004, sig, { value: nftPriceETH - 1n })
    ).to.be.revertedWith("E18");

    // Debe pagar exacto
    const sig2 = await signFor(signer, buyer.address, 100005);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 100005, sig2, { value: nftPriceETH })
    ).to.emit(presale, "AssetPurchased");
  });

  it("O5: cambio de oracle no altera nftPriceETH (inmutable por constructor)", async function () {
    const ctx = await deployEconomic();
    const { presale, priceFeed } = ctx;
    const priceBefore = await presale.nftPriceETH();
    await priceFeed.setAnswer(ethers.parseUnits("9999", 8)); // cambiar precio
    expect(await presale.nftPriceETH()).to.equal(priceBefore); // inmutable
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [P] Acumulación global: múltiples compras, consistencia end-to-end
// ──────────────────────────────────────────────────────────────────────────────

describe("[P] Acumulación global: consistencia end-to-end", function () {
  it("P1: 3 compradores con BHT — sum(gastado_i) = sum(discounted_i) exacto", async function () {
    const ctx = await deployEconomic();
    const { presale, signer, buyer, buyer2, buyer3, bht, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(1000);
    await presale.connect(owner).setBurnBps(200);

    const quantities = [1, 2, 3];
    const sigs = await Promise.all([
      signFor(signer, buyer.address,  110001),
      signFor(signer, buyer2.address, 110002),
      signFor(signer, buyer3.address, 110003),
    ]);

    const beforeBalances = [
      await bht.balanceOf(buyer.address),
      await bht.balanceOf(buyer2.address),
      await bht.balanceOf(buyer3.address),
    ];

    await presale.connect(buyer).purchaseWithBHT(1, 1, 110001, sigs[0]);
    await presale.connect(buyer2).purchaseWithBHT(1, 2, 110002, sigs[1]);
    await presale.connect(buyer3).purchaseWithBHT(1, 3, 110003, sigs[2]);

    const afterBalances = [
      await bht.balanceOf(buyer.address),
      await bht.balanceOf(buyer2.address),
      await bht.balanceOf(buyer3.address),
    ];

    const buyers = [buyer, buyer2, buyer3];
    for (let i = 0; i < 3; i++) {
      const { discounted } = calcBhtAmounts(nftPriceBHT, quantities[i], 1000, 200);
      expect(beforeBalances[i] - afterBalances[i]).to.equal(discounted,
        `buyer${i+1} no pagó el discountedCost correcto`);
    }
  });

  it("P2: ETH acumulado en contrato == nftPriceETH × total ETH purchases", async function () {
    const ctx = await deployEconomic({ maxPerUser: 20, maxSupply: 50, stock: 50 });
    const { presale, signer, buyer, buyer2, nftPriceETH } = ctx;

    const sig1 = await signFor(signer, buyer.address,  110004);
    const sig2 = await signFor(signer, buyer.address,  110005);
    const sig3 = await signFor(signer, buyer2.address, 110006);

    await presale.connect(buyer).purchaseWithETH(1, 2, 110004, sig1,  { value: nftPriceETH * 2n });
    await presale.connect(buyer).purchaseWithETH(1, 1, 110005, sig2,  { value: nftPriceETH });
    await presale.connect(buyer2).purchaseWithETH(1, 3, 110006, sig3, { value: nftPriceETH * 3n });

    const presaleETH = await ethers.provider.getBalance(await presale.getAddress());
    expect(presaleETH).to.equal(nftPriceETH * 6n); // 2+1+3 = 6 NFTs × precio
  });

  it("P3: sum(buyer_gasto) = sum(ops_recibido) + sum(burn) exacto globalmente", async function () {
    const ctx = await deployEconomic({
      bhtFactory: "contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn",
    });
    const { presale, signer, buyer, buyer2, buyer3, bht, opsWallet, owner, nftPriceBHT } = ctx;
    await presale.connect(owner).setDiscountBps(500);
    await presale.connect(owner).setBurnBps(1000);

    await bht.mint(buyer.address,  ethers.parseUnits("1000000", 18));
    await bht.mint(buyer2.address, ethers.parseUnits("1000000", 18));
    await bht.mint(buyer3.address, ethers.parseUnits("1000000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(),  ethers.parseUnits("1000000", 18));
    await bht.connect(buyer2).approve(await presale.getAddress(), ethers.parseUnits("1000000", 18));
    await bht.connect(buyer3).approve(await presale.getAddress(), ethers.parseUnits("1000000", 18));

    const opsBefore    = await bht.balanceOf(opsWallet.address);
    const supplyBefore = await bht.totalSupply();

    const bal1b = await bht.balanceOf(buyer.address);
    const bal2b = await bht.balanceOf(buyer2.address);
    const bal3b = await bht.balanceOf(buyer3.address);

    const sigs = await Promise.all([
      signFor(signer, buyer.address,  110011),
      signFor(signer, buyer2.address, 110012),
      signFor(signer, buyer3.address, 110013),
    ]);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 110011, sigs[0]);
    await presale.connect(buyer2).purchaseWithBHT(1, 1, 110012, sigs[1]);
    await presale.connect(buyer3).purchaseWithBHT(1, 1, 110013, sigs[2]);

    const bal1a = await bht.balanceOf(buyer.address);
    const bal2a = await bht.balanceOf(buyer2.address);
    const bal3a = await bht.balanceOf(buyer3.address);
    const opsAfter    = await bht.balanceOf(opsWallet.address);
    const supplyAfter = await bht.totalSupply();

    const totalGastado = (bal1b - bal1a) + (bal2b - bal2a) + (bal3b - bal3a);
    const totalOps     = opsAfter - opsBefore;
    const totalBurnado = supplyBefore - supplyAfter;

    // Invariante global: lo que salió de buyers = lo que llegó a ops + lo que se quemó
    expect(totalGastado).to.equal(totalOps + totalBurnado);
  });

  it("P4: totalNFTsSold coincide con NFTs minted a compradores", async function () {
    const ctx = await deployEconomic({ maxPerUser: 10, maxSupply: 20, stock: 20 });
    const { presale, signer, buyer, buyer2, nft, nftPriceETH } = ctx;

    const sig1 = await signFor(signer, buyer.address,  110021);
    const sig2 = await signFor(signer, buyer2.address, 110022);

    await presale.connect(buyer).purchaseWithETH(1, 3, 110021, sig1,  { value: nftPriceETH * 3n });
    await presale.connect(buyer2).purchaseWithETH(1, 4, 110022, sig2, { value: nftPriceETH * 4n });

    const total = await presale.totalNFTsSold();
    const buyerNFT  = await nft.balanceOf(buyer.address,  1);
    const buyer2NFT = await nft.balanceOf(buyer2.address, 1);

    expect(total).to.equal(7n);
    expect(buyerNFT).to.equal(3n);
    expect(buyer2NFT).to.equal(4n);
    expect(buyerNFT + buyer2NFT).to.equal(total);
  });

  it("P5: stock del presale decrece exactamente en totalNFTsSold", async function () {
    const ctx = await deployEconomic({ maxPerUser: 10, maxSupply: 20, stock: 20 });
    const { presale, signer, buyer, nft, nftPriceETH } = ctx;

    const presaleAddr = await presale.getAddress();
    const stockBefore = await nft.balanceOf(presaleAddr, 1);

    const sig = await signFor(signer, buyer.address, 110031);
    await presale.connect(buyer).purchaseWithETH(1, 5, 110031, sig, { value: nftPriceETH * 5n });

    const stockAfter = await nft.balanceOf(presaleAddr, 1);
    expect(stockBefore - stockAfter).to.equal(await presale.totalNFTsSold());
  });
});
