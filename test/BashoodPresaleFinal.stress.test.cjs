/**
 * test/BashoodPresaleFinal.stress.test.cjs
 *
 * Tests de estrés económico global — Chaos / Fuzz determinístico.
 *
 * Objetivo: detectar inconsistencias económicas emergentes bajo condiciones
 * extremas con ≥50 usuarios, parámetros dinámicos y mezcla de rutas.
 *
 * [Q] Chaos: ronda completa (oracle + burnBps + discountBps dinámicos)
 * [R] Conservación BHT exacta: Σ gastado = Σ ops + Σ burned
 * [S] ETH acumulación: Σ inputs = contract balance exacto
 * [T] Flip de decimals oracle mid-session — invariantes se mantienen
 * [U] Variación extrema burnBps/discountBps por cada compra
 * [V] Boundary maxPerUser bajo caos — nunca se excede
 * [W] Conservación global end-to-end mixta (ETH + BHT simultáneo)
 * [X] Resiliencia: compras fallidas no rompen invariantes
 */
"use strict";

const { expect }   = require("chai");
const { ethers }   = require("hardhat");

// ──────────────────────────────────────────────────────────────────────────────
// PRNG determinístico (LCG — reproducible, sin dependencia de Math.random)
// ──────────────────────────────────────────────────────────────────────────────
function makePRNG(seed) {
  let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
  return {
    /** float [0, 1) */
    next() {
      s = (s * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
      return Number(s & 0xFFFFFFFFn) / 0x100000000;
    },
    /** entero en [min, max] */
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    /** elemento aleatorio de un array */
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
    /** shuffle de array (Fisher-Yates) */
    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de fórmulas económicas (mirror de BashoodPresaleFinal)
// ──────────────────────────────────────────────────────────────────────────────
function mulDiv(a, b, c) { return (BigInt(a) * BigInt(b)) / BigInt(c); }

function calcPurchaseBHT(nftPriceBHT, qty, discBps, burnBps) {
  const base       = BigInt(nftPriceBHT) * BigInt(qty);
  const discounted = mulDiv(base, 10000n - BigInt(discBps), 10000n);
  const burn       = mulDiv(discounted, BigInt(burnBps), 10000n);
  const ops        = discounted - burn;
  return { discounted, burn, ops };
}

function calcServiceBHT(fiatWei, oracleAnswer, oracleDecimals, discBps, burnBps) {
  const bhtAmt     = mulDiv(fiatWei, 10n ** BigInt(oracleDecimals), oracleAnswer);
  const discounted = mulDiv(bhtAmt, 10000n - BigInt(discBps), 10000n);
  const burn       = mulDiv(discounted, BigInt(burnBps), 10000n);
  const ops        = discounted - burn;
  return { bhtAmt, discounted, burn, ops };
}

// ──────────────────────────────────────────────────────────────────────────────
// Firma (mismo algoritmo que el contrato)
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

// ──────────────────────────────────────────────────────────────────────────────
// Configuraciones oracle de caos
// ──────────────────────────────────────────────────────────────────────────────
const ORACLE_CONFIGS = [
  { decimals: 8,  answer:             100_000_000n },  // $1 / BHT
  { decimals: 8,  answer:          20_000_000_000n },  // $200 / BHT
  { decimals: 8,  answer:              50_000_000n },  // $0.5 / BHT
  { decimals: 8,  answer:       5_000_000_000_000n },  // $50 000 / BHT
  { decimals: 8,  answer:              10_000_000n },  // $0.1 / BHT  (precio bajo → BHT caro)
  { decimals: 18, answer: ethers.parseUnits("1",    18) },  // $1 (18 dec)
  { decimals: 18, answer: ethers.parseUnits("0.01", 18) },  // $0.01 (18 dec)
  { decimals: 18, answer: ethers.parseUnits("5000", 18) },  // $5000 (18 dec)
];

const BURN_BPS_LIST = [0, 100, 300, 500, 750, 1000, 1200, 1500];
const DISC_BPS_LIST = [0, 100, 500, 1000, 1500, 1999, 2000];

// ──────────────────────────────────────────────────────────────────────────────
// Deploy de infraestructura de caos
// ──────────────────────────────────────────────────────────────────────────────

/** Crea N wallets con claves privadas deterministas, conectadas al provider */
function makeBuyers(n, provider) {
  return Array.from({ length: n }, (_, i) => {
    // privkey empieza en 0x0...0200 para no colisionar con las cuentas Hardhat
    const pk = "0x" + (0x200 + i).toString(16).padStart(64, "0");
    return new ethers.Wallet(pk, provider);
  });
}

async function deployStress(opts = {}) {
  const [owner, opsWallet, authSigner] = await ethers.getSigners();

  // BHT con burnFrom real
  const BHT = await ethers.getContractFactory(
    "contracts/mocks/MockBHTWithBurn.sol:MockBHTWithBurn"
  );
  const bht = await BHT.deploy();
  await bht.waitForDeployment();

  // NFT
  const NFT = await ethers.getContractFactory(
    "contracts/mocks/MockNFT1155.sol:MockNFT1155"
  );
  const nft = await NFT.deploy();
  await nft.waitForDeployment();

  // Oracle inicial (8 decimals, $1/BHT)
  const PF = await ethers.getContractFactory(
    "contracts/mocks/MockPriceFeed.sol:MockPriceFeed"
  );
  const priceFeed = await PF.deploy(8, 100_000_000n);
  await priceFeed.waitForDeployment();

  // Referral
  const Ref = await ethers.getContractFactory(
    "contracts/mocks/MockReferral.sol:MockReferral"
  );
  const referral = await Ref.deploy(
    owner.address, owner.address, await nft.getAddress()
  );
  await referral.waitForDeployment();

  const nftPriceETH = opts.nftPriceETH ?? ethers.parseEther("0.001");
  const nftPriceBHT = opts.nftPriceBHT ?? ethers.parseUnits("10", 18);
  const maxPerUser  = opts.maxPerUser  ?? 8;
  const maxSupply   = opts.maxSupply   ?? 600;

  const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
  const presale = await Presale.deploy(
    await bht.getAddress(),
    await nft.getAddress(),
    await referral.getAddress(),
    opsWallet.address,
    opsWallet.address,
    nftPriceETH,
    nftPriceBHT,
    0, 0,
    maxSupply
  );
  await presale.waitForDeployment();

  await presale.connect(owner).setSigner(authSigner.address);
  await presale.connect(owner).setPriceFeed(await priceFeed.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(3600);
  await presale.connect(owner).setMaxPerUser(maxPerUser);
  await presale.connect(owner).setOperationsWallet(opsWallet.address);
  await presale.connect(owner).startPresale();

  // Mintear stock NFT al presale
  await nft.connect(owner).mint(owner.address, 1, maxSupply);
  await nft.connect(owner).safeTransferFrom(
    owner.address, await presale.getAddress(), 1, maxSupply, "0x"
  );

  // Crear 54 compradores deterministas
  const buyers = makeBuyers(54, ethers.provider);

  // Fondear con ETH y BHT
  const ethFund  = ethers.parseEther("0.1");
  const bhtFund  = ethers.parseUnits("100000", 18);
  for (const b of buyers) {
    await owner.sendTransaction({ to: b.address, value: ethFund });
    await bht.mint(b.address, bhtFund);
    await bht.connect(b).approve(await presale.getAddress(), bhtFund * 100n);
  }

  return {
    owner, opsWallet, authSigner,
    bht, nft, priceFeed, presale, referral,
    nftPriceETH, nftPriceBHT,
    maxPerUser, maxSupply,
    buyers,
    PF, // factory para crear nuevos price feeds
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilidad: cambiar oracle (recrea el price feed si cambian los decimals)
// ──────────────────────────────────────────────────────────────────────────────
async function applyOracleConfig(ctx, cfg) {
  if (ctx.currentOracleDecimals !== cfg.decimals) {
    // Necesitamos un nuevo contrato MockPriceFeed con los decimals correctos
    const newFeed = await ctx.PF.deploy(cfg.decimals, cfg.answer);
    await newFeed.waitForDeployment();
    await ctx.presale.connect(ctx.owner).setPriceFeed(await newFeed.getAddress());
    ctx.priceFeed = newFeed;
    ctx.currentOracleDecimals = cfg.decimals;
    ctx.currentOracleAnswer   = cfg.answer;
  } else {
    await ctx.priceFeed.setAnswer(cfg.answer);
    ctx.currentOracleAnswer = cfg.answer;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// [Q] Ronda de caos completa — todos los invariantes
// ──────────────────────────────────────────────────────────────────────────────

describe("[Q] Chaos: ronda completa con parámetros dinámicos", function () {
  this.timeout(600_000);

  it("Q1: 8 rondas × 6 compradores — Σ BHT gastado = Σ ops + Σ burned", async function () {
    const ctx = await deployStress();
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    const rng = makePRNG(0xDEADBEEF);
    let nonceCounter = 500_000;

    // Contabilidad global BHT
    let totalBHTSpent   = 0n;
    const opsBefore     = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore  = await ctx.bht.totalSupply();

    // Seguimiento de compras por usuario (para no exceder maxPerUser)
    const userQty = new Map();
    const getRemaining = (addr) =>
      ctx.maxPerUser - (userQty.get(addr) ?? 0);

    const ROUNDS = 8;
    for (let r = 0; r < ROUNDS; r++) {
      // Cambiar parámetros de la ronda
      const oracle    = ORACLE_CONFIGS[r % ORACLE_CONFIGS.length];
      const burnBps   = rng.pick(BURN_BPS_LIST);
      const discBps   = rng.pick(DISC_BPS_LIST);

      await applyOracleConfig(ctx, oracle);
      await ctx.presale.connect(ctx.owner).setBurnBps(burnBps);
      await ctx.presale.connect(ctx.owner).setDiscountBps(discBps);

      // Seleccionar 6 compradores aleatoriamente para esta ronda
      const roundBuyers = rng.shuffle(ctx.buyers).slice(0, 6);

      for (const buyer of roundBuyers) {
        const remaining = getRemaining(buyer.address);
        if (remaining <= 0) continue;
        const qty = Math.min(rng.int(1, 3), remaining);

        // Decidir método: 0 = ETH, 1 = BHT
        const useBHT = rng.next() > 0.5;

        if (useBHT) {
          const nonce = nonceCounter++;
          const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
          const balBefore = await ctx.bht.balanceOf(buyer.address);
          await ctx.presale.connect(buyer).purchaseWithBHT(1, qty, nonce, sig);
          const balAfter  = await ctx.bht.balanceOf(buyer.address);
          totalBHTSpent  += (balBefore - balAfter);
        } else {
          const nonce = nonceCounter++;
          const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
          await ctx.presale.connect(buyer).purchaseWithETH(
            1, qty, nonce, sig,
            { value: ctx.nftPriceETH * BigInt(qty) }
          );
        }
        userQty.set(buyer.address, (userQty.get(buyer.address) ?? 0) + qty);
      }
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();

    const totalOps    = opsAfter - opsBefore;
    const totalBurned = supplyBefore - supplyAfter;

    // Invariante central: lo gastado en BHT = ops + burned
    expect(totalBHTSpent).to.equal(totalOps + totalBurned,
      "Conservación BHT: gastado ≠ ops + burned");
  });

  it("Q2: 50 compradores distintos — cada uno compra exactamente 1 NFT con BHT", async function () {
    const ctx = await deployStress({ maxPerUser: 2, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    const rng = makePRNG(0xCAFEBABE);
    let nonceCounter = 600_000;

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();
    let totalBHTSpent  = 0n;

    // 50 compradores, cada uno compra 1 NFT con un discBps / burnBps diferente
    const buyers50 = ctx.buyers.slice(0, 50);

    for (let i = 0; i < buyers50.length; i++) {
      const buyer  = buyers50[i];
      const discBps = DISC_BPS_LIST[i % DISC_BPS_LIST.length];
      const burnBps = BURN_BPS_LIST[i % BURN_BPS_LIST.length];

      await ctx.presale.connect(ctx.owner).setDiscountBps(discBps);
      await ctx.presale.connect(ctx.owner).setBurnBps(burnBps);

      const nonce   = nonceCounter++;
      const sig     = await signFor(ctx.authSigner, buyer.address, nonce);
      const balBefore = await ctx.bht.balanceOf(buyer.address);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      const balAfter  = await ctx.bht.balanceOf(buyer.address);
      totalBHTSpent  += (balBefore - balAfter);

      // Verificar que este comprador pagó el discountedCost correcto
      const { discounted } = calcPurchaseBHT(ctx.nftPriceBHT, 1, discBps, burnBps);
      expect(balBefore - balAfter).to.equal(discounted,
        `Buyer ${i} pagó cantidad incorrecta`);
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();

    expect(totalBHTSpent).to.equal(
      (opsAfter - opsBefore) + (supplyBefore - supplyAfter),
      "Invariante global Q2 rota"
    );
    // 50 NFTs vendidos
    expect(await ctx.presale.totalNFTsSold()).to.equal(50n);
  });

  it("Q3: pausa mid-session no rompe contabilidad — solo bloquea payService", async function () {
    const ctx = await deployStress();
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;
    const rng = makePRNG(0xA1B2C3D4);
    let nonceCounter = 700_000;

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();
    let totalBHTSpent  = 0n;

    // Fase 1: 10 compras BHT antes de pausa
    for (let i = 0; i < 10; i++) {
      const buyer     = ctx.buyers[i];
      const nonce     = nonceCounter++;
      const sig       = await signFor(ctx.authSigner, buyer.address, nonce);
      const balBefore = await ctx.bht.balanceOf(buyer.address);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      const balAfter  = await ctx.bht.balanceOf(buyer.address);
      totalBHTSpent  += balBefore - balAfter;
    }

    // Pausar → purchaseWithBHT sigue funcionando (no tiene whenNotPaused)
    await ctx.presale.connect(ctx.owner).pause();

    // payServiceWithBHT debe rever con pausa (buyers ya tienen BHT del setup)
    await expect(
      ctx.presale.connect(ctx.buyers[0])["payServiceWithBHT(uint256,uint256)"](99n, ethers.parseUnits("10", 18))
    ).to.be.reverted;

    // compras de NFT siguen funcionando pese a la pausa
    const buyer11    = ctx.buyers[10];
    const nonce11    = nonceCounter++;
    const sig11      = await signFor(ctx.authSigner, buyer11.address, nonce11);
    const bb11       = await ctx.bht.balanceOf(buyer11.address);
    await ctx.presale.connect(buyer11).purchaseWithBHT(1, 1, nonce11, sig11);
    totalBHTSpent   += bb11 - (await ctx.bht.balanceOf(buyer11.address));

    // Despausar y comprar una más
    await ctx.presale.connect(ctx.owner).unpause();
    const buyer12    = ctx.buyers[11];
    const nonce12    = nonceCounter++;
    const sig12      = await signFor(ctx.authSigner, buyer12.address, nonce12);
    const bb12       = await ctx.bht.balanceOf(buyer12.address);
    await ctx.presale.connect(buyer12).purchaseWithBHT(1, 1, nonce12, sig12);
    totalBHTSpent   += bb12 - (await ctx.bht.balanceOf(buyer12.address));

    const opsAfterFinal = await ctx.bht.balanceOf(ctx.opsWallet.address);
    // burnBps=0 por defecto → todo el gasto va a ops, sin burn de supply
    expect(opsAfterFinal - opsBefore).to.equal(totalBHTSpent,
      "Invariante BHT rota tras pausa/unpause");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [R] Conservación BHT exacta bajo variación extrema de parámetros
// ──────────────────────────────────────────────────────────────────────────────

describe("[R] Conservación BHT exacta: Σ gastado = Σ ops + Σ burned", function () {
  this.timeout(300_000);

  it("R1: todos los combos (burnBps × discountBps) — invariante por compra + global", async function () {
    const ctx = await deployStress({ maxPerUser: 10, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    // Todas las combinaciones de burn × discount
    const combos = [];
    for (const b of BURN_BPS_LIST) {
      for (const d of DISC_BPS_LIST) {
        combos.push([b, d]);
      }
    }
    // 56 combos — usamos los primeros 50 (uno por buyer)
    const cases = combos.slice(0, 50);

    const opsBefore0   = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore0 = await ctx.bht.totalSupply();
    let totalSpent  = 0n;
    let nonceCounter = 800_000;

    for (let i = 0; i < cases.length; i++) {
      const [burnBps, discBps] = cases[i];
      const buyer = ctx.buyers[i];

      await ctx.presale.connect(ctx.owner).setBurnBps(burnBps);
      await ctx.presale.connect(ctx.owner).setDiscountBps(discBps);

      const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
      const supplyBefore = await ctx.bht.totalSupply();
      const balBefore    = await ctx.bht.balanceOf(buyer.address);

      const nonce = nonceCounter++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);

      const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
      const supplyAfter = await ctx.bht.totalSupply();
      const balAfter    = await ctx.bht.balanceOf(buyer.address);

      const spentByBuyer = balBefore - balAfter;
      const opsGain      = opsAfter - opsBefore;
      const burnedAmt    = supplyBefore - supplyAfter;

      // Invariante por compra individual
      expect(spentByBuyer).to.equal(opsGain + burnedAmt,
        `Combo burn=${burnBps} disc=${discBps}: conservación rota`);

      // Verificar contra la fórmula off-chain
      const { discounted, burn, ops } = calcPurchaseBHT(ctx.nftPriceBHT, 1, discBps, burnBps);
      expect(spentByBuyer).to.equal(discounted, `Combo ${i}: monto incorrecto`);
      expect(opsGain).to.equal(ops,           `Combo ${i}: ops incorrecto`);
      expect(burnedAmt).to.equal(burn,         `Combo ${i}: burn incorrecto`);

      totalSpent += spentByBuyer;
    }

    const opsFinal    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyFinal = await ctx.bht.totalSupply();

    // Invariante global
    expect(totalSpent).to.equal(
      (opsFinal - opsBefore0) + (supplyBefore0 - supplyFinal),
      "Invariante global R1 rota"
    );
  });

  it("R2: variación de oracle entre compras BHT — precio unitario siempre es nftPriceBHT", async function () {
    // purchaseWithBHT no usa el oracle para el precio — solo lo valida.
    // El precio fijo es siempre nftPriceBHT independientemente del oracle.
    const ctx = await deployStress({ nftPriceBHT: ethers.parseUnits("5", 18) });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 850_000;
    const oracleCycle = [
      100_000_000n,         // $1
      1_000_000_000n,       // $10
      50_000_000n,          // $0.5
      10_000_000_000_000n,  // $100k
    ];

    for (let i = 0; i < 4; i++) {
      await ctx.priceFeed.setAnswer(oracleCycle[i]);
      ctx.currentOracleAnswer = oracleCycle[i];

      const buyer   = ctx.buyers[i];
      const nonce   = nonceCounter++;
      const sig     = await signFor(ctx.authSigner, buyer.address, nonce);
      const balBefore = await ctx.bht.balanceOf(buyer.address);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      const balAfter  = await ctx.bht.balanceOf(buyer.address);

      // Siempre paga nftPriceBHT (discount=0, burn=0 por defecto)
      expect(balBefore - balAfter).to.equal(BigInt(ctx.nftPriceBHT),
        `Ronda ${i}: oracle price cambió el costo BHT (no debería)`);
    }
  });

  it("R3: 54 compradores distintos — sum(NFT balances) == totalNFTsSold", async function () {
    const ctx = await deployStress({ maxPerUser: 2, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 900_000;
    const rng = makePRNG(0x12345678);

    for (let i = 0; i < 54; i++) {
      const buyer = ctx.buyers[i];
      const nonce = nonceCounter++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
      if (rng.next() > 0.5) {
        await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      } else {
        await ctx.presale.connect(buyer).purchaseWithETH(
          1, 1, nonce, sig, { value: ctx.nftPriceETH }
        );
      }
    }

    // sum de balances NFT de todos los buyers debe ser totalNFTsSold
    let nftSum = 0n;
    for (const b of ctx.buyers) {
      nftSum += await ctx.nft.balanceOf(b.address, 1);
    }
    const totalSold = await ctx.presale.totalNFTsSold();
    expect(nftSum).to.equal(totalSold, "NFTs en wallets ≠ totalNFTsSold");
    expect(totalSold).to.equal(54n);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [S] ETH: acumulación exacta en contrato
// ──────────────────────────────────────────────────────────────────────────────

describe("[S] ETH: Σ inputs = contract balance exacto", function () {
  this.timeout(300_000);

  it("S1: 50 compradores con ETH — saldo del contrato es nftPriceETH × totalSold", async function () {
    const ctx = await deployStress({ maxPerUser: 2 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 950_000;
    let expectedETH  = 0n;

    for (let i = 0; i < 50; i++) {
      const buyer = ctx.buyers[i];
      const qty   = 1;
      const nonce = nonceCounter++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
      await ctx.presale.connect(buyer).purchaseWithETH(
        1, qty, nonce, sig, { value: ctx.nftPriceETH * BigInt(qty) }
      );
      expectedETH += ctx.nftPriceETH * BigInt(qty);
    }

    const contractBal = await ethers.provider.getBalance(await ctx.presale.getAddress());
    expect(contractBal).to.equal(expectedETH);
    expect(await ctx.presale.totalNFTsSold()).to.equal(50n);
  });

  it("S2: compras ETH con qty variable (1-4) — balance exacto", async function () {
    const ctx = await deployStress({ maxPerUser: 8, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 960_000;
    const rng = makePRNG(0xFACEFEED);
    let expectedETH  = 0n;
    let totalQty     = 0n;

    // Usar 20 compradores con cantidades variables
    const buyers = ctx.buyers.slice(0, 20);
    for (const buyer of buyers) {
      const qty   = rng.int(1, 4);
      const nonce = nonceCounter++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
      await ctx.presale.connect(buyer).purchaseWithETH(
        1, qty, nonce, sig, { value: ctx.nftPriceETH * BigInt(qty) }
      );
      expectedETH += ctx.nftPriceETH * BigInt(qty);
      totalQty    += BigInt(qty);
    }

    const contractBal = await ethers.provider.getBalance(await ctx.presale.getAddress());
    expect(contractBal).to.equal(expectedETH);
    expect(await ctx.presale.totalNFTsSold()).to.equal(totalQty);
  });

  it("S3: mezcla ETH y BHT — ETH en contrato aplica solo a compras ETH", async function () {
    const ctx = await deployStress({ maxPerUser: 6, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 970_000;
    const rng = makePRNG(0xBEEFCAFE);
    let expectedETH   = 0n;
    let totalBHTSpent = 0n;

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();

    for (let i = 0; i < 40; i++) {
      const buyer   = ctx.buyers[i];
      const useBHT  = rng.next() > 0.4;
      const nonce   = nonceCounter++;
      const sig     = await signFor(ctx.authSigner, buyer.address, nonce);

      if (useBHT) {
        const balBefore = await ctx.bht.balanceOf(buyer.address);
        await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
        totalBHTSpent  += balBefore - (await ctx.bht.balanceOf(buyer.address));
      } else {
        await ctx.presale.connect(buyer).purchaseWithETH(
          1, 1, nonce, sig, { value: ctx.nftPriceETH }
        );
        expectedETH += ctx.nftPriceETH;
      }
    }

    const contractBal  = await ethers.provider.getBalance(await ctx.presale.getAddress());
    const opsAfter     = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter  = await ctx.bht.totalSupply();

    // ETH exacta (no mezclada con BHT)
    expect(contractBal).to.equal(expectedETH);
    // BHT conservado
    expect(totalBHTSpent).to.equal(
      (opsAfter - opsBefore) + (supplyBefore - supplyAfter)
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [T] Flip de decimals oracle mid-session
// ──────────────────────────────────────────────────────────────────────────────

describe("[T] Flip de decimals oracle mid-session — invariantes se mantienen", function () {
  this.timeout(300_000);

  it("T1: 8-dec → 18-dec → 8-dec — conservation BHT en payServiceWithBHT", async function () {
    const ctx = await deployStress();
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 1_000_000;
    let totalSpent = 0n;

    const phases = [
      { decimals: 8,  answer: 100_000_000n,                    fiat: ethers.parseUnits("100", 18) },
      { decimals: 18, answer: ethers.parseUnits("1",    18),   fiat: ethers.parseUnits("200", 18) },
      { decimals: 8,  answer: 200_000_000n,                    fiat: ethers.parseUnits("50",  18) },
      { decimals: 18, answer: ethers.parseUnits("0.5",  18),   fiat: ethers.parseUnits("75",  18) },
    ];

    // Fondear a todos los buyers ANTES de tomar snapshots (para no contaminar supply)
    for (let p = 0; p < phases.length; p++) {
      const buyer = ctx.buyers[p];
      await ctx.bht.mint(buyer.address, ethers.parseUnits("10000000", 18));
      await ctx.bht.connect(buyer).approve(
        await ctx.presale.getAddress(), ethers.parseUnits("10000000", 18)
      );
    }

    // Snapshots DESPUÉS de todos los mints
    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();

    for (let p = 0; p < phases.length; p++) {
      const phase  = phases[p];
      const buyer  = ctx.buyers[p];

      await applyOracleConfig(ctx, { decimals: phase.decimals, answer: phase.answer });

      const { discounted } = calcServiceBHT(
        BigInt(phase.fiat), BigInt(phase.answer), phase.decimals, 0, 0
      );
      const balBefore = await ctx.bht.balanceOf(buyer.address);
      await ctx.presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](
        BigInt(p), phase.fiat
      );
      const balAfter = await ctx.bht.balanceOf(buyer.address);

      const spent = balBefore - balAfter;
      expect(spent).to.equal(discounted, `Fase ${p}: pago incorrecto`);
      totalSpent += spent;
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();

    expect(totalSpent).to.equal(
      (opsAfter - opsBefore) + (supplyBefore - supplyAfter)
    );
  });

  it("T2: purchaseWithBHT es agnóstica al flip de decimals del oracle", async function () {
    // El precio de purchaseWithBHT es nftPriceBHT (fijo). El oracle solo valida freshness.
    const ctx = await deployStress({ nftPriceBHT: ethers.parseUnits("10", 18) });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nonceCounter = 1_100_000;

    const decimalFlips = [
      { decimals: 8,  answer: 1_000_000_000_000n },  // $10k
      { decimals: 18, answer: ethers.parseUnits("10000", 18) },
      { decimals: 8,  answer: 1n },                   // $0.00000001 (extremo mínimo)
      { decimals: 18, answer: ethers.parseUnits("999999", 18) },
    ];

    for (let i = 0; i < decimalFlips.length; i++) {
      await applyOracleConfig(ctx, decimalFlips[i]);

      const buyer     = ctx.buyers[i];
      const nonce     = nonceCounter++;
      const sig       = await signFor(ctx.authSigner, buyer.address, nonce);
      const balBefore = await ctx.bht.balanceOf(buyer.address);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      const balAfter  = await ctx.bht.balanceOf(buyer.address);

      expect(balBefore - balAfter).to.equal(BigInt(ctx.nftPriceBHT),
        `Flip ${i}: precio BHT afectado por oracle`);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [U] Cobertura exhaustiva de burnBps/discountBps extremos
// ──────────────────────────────────────────────────────────────────────────────

describe("[U] burnBps y discountBps: cobertura extrema por compra", function () {
  this.timeout(300_000);

  it("U1: burnBps=1500 discount=2000 — buyer paga 80%, ops recibe 68%, burn=12%", async function () {
    // base=100 BHT (12 dec zeros si queremos números redondos)
    const price = ethers.parseUnits("100", 18);
    const ctx   = await deployStress({ nftPriceBHT: price });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    await ctx.presale.connect(ctx.owner).setDiscountBps(2000);
    await ctx.presale.connect(ctx.owner).setBurnBps(1500);

    const buyer     = ctx.buyers[0];
    const nonce     = 1_200_000;
    const sig       = await signFor(ctx.authSigner, buyer.address, nonce);

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();
    const balBefore    = await ctx.bht.balanceOf(buyer.address);

    await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();
    const balAfter    = await ctx.bht.balanceOf(buyer.address);

    const spent  = balBefore - balAfter;
    const ops    = opsAfter - opsBefore;
    const burned = supplyBefore - supplyAfter;

    const { discounted, burn, ops: opsExp } = calcPurchaseBHT(price, 1, 2000, 1500);

    expect(spent).to.equal(discounted); // 80% del base
    expect(ops).to.equal(opsExp);       // discounted - burn
    expect(burned).to.equal(burn);      // 15% del discounted
    expect(burned + ops).to.equal(spent); // invariante
  });

  it("U2: qty=8 con burnBps=1500 discount=2000 — linealidad correcta", async function () {
    const price = ethers.parseUnits("10", 18);
    const ctx   = await deployStress({ nftPriceBHT: price, maxPerUser: 10 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    await ctx.presale.connect(ctx.owner).setDiscountBps(2000);
    await ctx.presale.connect(ctx.owner).setBurnBps(1500);

    const buyer     = ctx.buyers[0];
    const nonce     = 1_200_001;
    const sig       = await signFor(ctx.authSigner, buyer.address, nonce);
    const balBefore = await ctx.bht.balanceOf(buyer.address);
    await ctx.presale.connect(buyer).purchaseWithBHT(1, 8, nonce, sig);
    const balAfter  = await ctx.bht.balanceOf(buyer.address);

    const { discounted } = calcPurchaseBHT(price, 8, 2000, 1500);
    expect(balBefore - balAfter).to.equal(discounted);
  });

  it("U3: ciclo de toda la tabla burnBps × discountBps — Σ global invariante", async function () {
    const ctx   = await deployStress({ maxPerUser: 10, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nc = 1_300_000;
    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();
    let totalSpent = 0n;

    // 8 rounds, cada ronda cambia ambos parámetros
    for (let i = 0; i < 8; i++) {
      const burnBps = BURN_BPS_LIST[i];
      const discBps = DISC_BPS_LIST[i % DISC_BPS_LIST.length];
      await ctx.presale.connect(ctx.owner).setBurnBps(burnBps);
      await ctx.presale.connect(ctx.owner).setDiscountBps(discBps);

      const buyer  = ctx.buyers[i];
      const nonce  = nc++;
      const sig    = await signFor(ctx.authSigner, buyer.address, nonce);
      const bb     = await ctx.bht.balanceOf(buyer.address);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      totalSpent  += bb - (await ctx.bht.balanceOf(buyer.address));
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();
    expect(totalSpent).to.equal((opsAfter - opsBefore) + (supplyBefore - supplyAfter));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [V] maxPerUser honrado bajo caos
// ──────────────────────────────────────────────────────────────────────────────

describe("[V] maxPerUser: nunca se excede bajo condiciones de caos", function () {
  this.timeout(300_000);

  it("V1: 10 compradores intentan comprar maxPerUser+1 — el exceso revierte", async function () {
    const maxPerUser = 5;
    const ctx = await deployStress({ maxPerUser, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nc = 1_400_000;

    for (let i = 0; i < 10; i++) {
      const buyer = ctx.buyers[i];

      // Comprar hasta el límite
      const nonce1 = nc++;
      const sig1   = await signFor(ctx.authSigner, buyer.address, nonce1);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, maxPerUser, nonce1, sig1);

      // El siguiente intento debe rever con E29
      const nonce2 = nc++;
      const sig2   = await signFor(ctx.authSigner, buyer.address, nonce2);
      await expect(
        ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce2, sig2)
      ).to.be.revertedWith("E29");

      // Confirmar que userPurchases no superó el límite
      expect(await ctx.presale.userPurchases(buyer.address)).to.equal(maxPerUser);
    }
  });

  it("V2: compras ETH también respetan maxPerUser", async function () {
    const maxPerUser = 3;
    const ctx = await deployStress({ maxPerUser, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    let nc = 1_500_000;
    const buyer = ctx.buyers[0];

    const nonce1 = nc++;
    const sig1   = await signFor(ctx.authSigner, buyer.address, nonce1);
    await ctx.presale.connect(buyer).purchaseWithETH(
      1, maxPerUser, nonce1, sig1, { value: ctx.nftPriceETH * BigInt(maxPerUser) }
    );

    const nonce2 = nc++;
    const sig2   = await signFor(ctx.authSigner, buyer.address, nonce2);
    await expect(
      ctx.presale.connect(buyer).purchaseWithETH(
        1, 1, nonce2, sig2, { value: ctx.nftPriceETH }
      )
    ).to.be.revertedWith("E17");  // purchaseWithETH usa E17 para maxPerUser
  });

  it("V3: 50 compradores aleatorios — ninguno excede maxPerUser al final", async function () {
    const maxPerUser = 4;
    const ctx = await deployStress({ maxPerUser, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    const rng = makePRNG(0xABCD1234);
    let nc = 1_600_000;

    for (let i = 0; i < 50; i++) {
      const buyer   = ctx.buyers[i % ctx.buyers.length];
      const already = Number(await ctx.presale.userPurchases(buyer.address));
      const rem     = maxPerUser - already;
      if (rem <= 0) continue;

      const qty   = Math.min(rng.int(1, 3), rem);
      const nonce = nc++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
      await ctx.presale.connect(buyer).purchaseWithBHT(1, qty, nonce, sig);
    }

    // Verificar que ningún buyer superó maxPerUser
    for (const buyer of ctx.buyers) {
      const purchases = await ctx.presale.userPurchases(buyer.address);
      expect(purchases).to.be.lte(maxPerUser,
        `Buyer ${buyer.address} superó maxPerUser`);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [W] Conservación global end-to-end (ETH + BHT simultáneo)
// ──────────────────────────────────────────────────────────────────────────────

describe("[W] Conservación global end-to-end: ETH + BHT simultáneo", function () {
  this.timeout(600_000);

  it("W1: 54 compradores mixtos — todas las invariantes juntas", async function () {
    const ctx = await deployStress({ maxPerUser: 4, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    const rng = makePRNG(0x5A1C2D3E);
    let nc = 1_700_000;

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();

    let totalBHTSpent = 0n;
    let totalETHSent  = 0n;
    let totalNFTs     = 0n;

    const userBuy = new Map(); // addr → qty ya comprada

    const buyers = rng.shuffle([...ctx.buyers]); // shuffle los 54

    for (const buyer of buyers) {
      const already = userBuy.get(buyer.address) ?? 0;
      const rem     = ctx.maxPerUser - already;
      if (rem <= 0) continue;

      const qty   = Math.min(rng.int(1, 3), rem);
      const useB  = rng.next() > 0.45; // 55% BHT, 45% ETH

      // Cambiar parámetros cada 10 compras aprox
      if (rng.next() > 0.8) {
        const burnBps = rng.pick(BURN_BPS_LIST);
        const discBps = rng.pick(DISC_BPS_LIST);
        const oracle  = rng.pick(ORACLE_CONFIGS);
        await ctx.presale.connect(ctx.owner).setBurnBps(burnBps);
        await ctx.presale.connect(ctx.owner).setDiscountBps(discBps);
        await applyOracleConfig(ctx, oracle);
      }

      const nonce = nc++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);

      if (useB) {
        const balBefore = await ctx.bht.balanceOf(buyer.address);
        await ctx.presale.connect(buyer).purchaseWithBHT(1, qty, nonce, sig);
        totalBHTSpent  += balBefore - (await ctx.bht.balanceOf(buyer.address));
      } else {
        const ethVal = ctx.nftPriceETH * BigInt(qty);
        await ctx.presale.connect(buyer).purchaseWithETH(1, qty, nonce, sig, { value: ethVal });
        totalETHSent  += ethVal;
      }

      userBuy.set(buyer.address, already + qty);
      totalNFTs += BigInt(qty);
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();
    const contractBal = await ethers.provider.getBalance(await ctx.presale.getAddress());

    // I1: BHT conservation
    expect(totalBHTSpent).to.equal(
      (opsAfter - opsBefore) + (supplyBefore - supplyAfter),
      "W1: BHT no conservado"
    );
    // I2: ETH conservation
    expect(contractBal).to.equal(totalETHSent, "W1: ETH no conservado");
    // I3: totalNFTsSold
    expect(await ctx.presale.totalNFTsSold()).to.equal(totalNFTs, "W1: totalNFTsSold incorrecto");
    // I4: stock residual
    const presaleNFT = await ctx.nft.balanceOf(await ctx.presale.getAddress(), 1);
    expect(presaleNFT).to.equal(BigInt(ctx.maxSupply) - totalNFTs, "W1: stock residual incorrecto");
  });

  it("W2: N rondas con cambio de oracle decimals — conservación acumulada", async function () {
    const ctx = await deployStress({ maxPerUser: 6, maxSupply: 600 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;

    const rng = makePRNG(0xDEC1AA15);
    let nc = 1_800_000;

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();
    let totalSpent = 0n;

    const oraclePlan = [
      { decimals: 8,  answer: 100_000_000n },
      { decimals: 18, answer: ethers.parseUnits("1", 18) },
      { decimals: 8,  answer: 500_000_000n },
      { decimals: 18, answer: ethers.parseUnits("5", 18) },
      { decimals: 8,  answer: 2_000_000_000n },
    ];

    for (let round = 0; round < oraclePlan.length; round++) {
      await applyOracleConfig(ctx, oraclePlan[round]);

      // 8 compradores en esta ronda
      const roundBuyers = ctx.buyers.slice(round * 8, (round + 1) * 8);
      for (const buyer of roundBuyers) {
        const nonce = nc++;
        const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
        const bb    = await ctx.bht.balanceOf(buyer.address);
        await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
        totalSpent += bb - (await ctx.bht.balanceOf(buyer.address));
      }
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();

    expect(totalSpent).to.equal(
      (opsAfter - opsBefore) + (supplyBefore - supplyAfter),
      "W2: conservación rota tras oracle decimal flip"
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [X] Resiliencia: compras fallidas no rompen invariantes
// ──────────────────────────────────────────────────────────────────────────────

describe("[X] Resiliencia: compras fallidas no contaminan estado ni contabilidad", function () {
  this.timeout(300_000);

  it("X1: revert por nonce reusado — balance inmutable", async function () {
    const ctx = await deployStress();
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;
    const buyer = ctx.buyers[0];
    const nonce = 1_900_001;
    const sig   = await signFor(ctx.authSigner, buyer.address, nonce);

    await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);

    const balSnap = await ctx.bht.balanceOf(buyer.address);
    const sig2    = await signFor(ctx.authSigner, buyer.address, nonce); // mismo nonce
    await expect(
      ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig2)
    ).to.be.revertedWith("E25");
    expect(await ctx.bht.balanceOf(buyer.address)).to.equal(balSnap);
  });

  it("X2: revert por ETH insuficiente — balance ETH + contrato inmutable", async function () {
    const ctx = await deployStress();
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;
    const buyer = ctx.buyers[1];
    const nonce = 1_900_002;
    const sig   = await signFor(ctx.authSigner, buyer.address, nonce);

    const contractBefore = await ethers.provider.getBalance(await ctx.presale.getAddress());
    await expect(
      ctx.presale.connect(buyer).purchaseWithETH(
        1, 1, nonce, sig, { value: ctx.nftPriceETH - 1n }
      )
    ).to.be.revertedWith("E18");
    expect(await ethers.provider.getBalance(await ctx.presale.getAddress()))
      .to.equal(contractBefore);
  });

  it("X3: revert intercalado con éxito — contabilidad solo refleja los éxitos", async function () {
    const ctx = await deployStress({ maxPerUser: 3 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;
    let nc = 1_900_010;

    const opsBefore    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyBefore = await ctx.bht.totalSupply();
    let counted = 0n;

    for (let i = 0; i < 10; i++) {
      const buyer = ctx.buyers[i];
      const nonce = nc++;
      const sig   = await signFor(ctx.authSigner, buyer.address, nonce);
      const bb    = await ctx.bht.balanceOf(buyer.address);

      if (i % 3 === 0) {
        // Intento fallido: ETH insuficiente para compra ETH (no afecta BHT)
        const nonce2 = nc++;
        const sig2   = await signFor(ctx.authSigner, buyer.address, nonce2);
        await expect(
          ctx.presale.connect(buyer).purchaseWithETH(
            1, 1, nonce2, sig2, { value: 0n }
          )
        ).to.be.reverted;
      }

      // Compra BHT exitosa
      await ctx.presale.connect(buyer).purchaseWithBHT(1, 1, nonce, sig);
      counted += bb - (await ctx.bht.balanceOf(buyer.address));
    }

    const opsAfter    = await ctx.bht.balanceOf(ctx.opsWallet.address);
    const supplyAfter = await ctx.bht.totalSupply();

    expect(counted).to.equal(
      (opsAfter - opsBefore) + (supplyBefore - supplyAfter),
      "X3: los reverts contaminaron la contabilidad"
    );
    expect(await ctx.presale.totalNFTsSold()).to.equal(10n);
  });

  it("X4: oracle stale mid-session — compras BHT revertan, estado no cambia", async function () {
    const ctx = await deployStress();
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;
    let nc = 1_900_050;

    // Compra exitosa antes de stale
    const buyer0 = ctx.buyers[0];
    const sig0   = await signFor(ctx.authSigner, buyer0.address, nc);
    await ctx.presale.connect(buyer0).purchaseWithBHT(1, 1, nc++, sig0);
    const soldAfterFirst = await ctx.presale.totalNFTsSold();

    // Simular oracle stale: updatedAt = bloque actual - 3601 > maxStaleness=3600
    const staleTs = (await ethers.provider.getBlock("latest")).timestamp - 3700;
    await ctx.priceFeed.setAnswerWithTimestamp(100_000_000n, staleTs);

    const buyer1 = ctx.buyers[1];
    const sig1   = await signFor(ctx.authSigner, buyer1.address, nc);
    await expect(
      ctx.presale.connect(buyer1).purchaseWithBHT(1, 1, nc++, sig1)
    ).to.be.reverted;

    // totalNFTsSold no cambió
    expect(await ctx.presale.totalNFTsSold()).to.equal(soldAfterFirst);
  });

  it("X5: agotamiento de stock — la compra que excede el supply revierte", async function () {
    const maxSupply = 5;
    const ctx = await deployStress({ maxSupply, maxPerUser: 10 });
    ctx.currentOracleDecimals = 8;
    ctx.currentOracleAnswer   = 100_000_000n;
    let nc = 1_900_100;

    // Comprar todo el stock
    const buyer0 = ctx.buyers[0];
    const sig0   = await signFor(ctx.authSigner, buyer0.address, nc);
    await ctx.presale.connect(buyer0).purchaseWithBHT(1, maxSupply, nc++, sig0);

    expect(await ctx.presale.totalNFTsSold()).to.equal(BigInt(maxSupply));

    // Siguiente compra debe rever por E27 (supply agotado)
    const buyer1 = ctx.buyers[1];
    const sig1   = await signFor(ctx.authSigner, buyer1.address, nc);
    await expect(
      ctx.presale.connect(buyer1).purchaseWithBHT(1, 1, nc++, sig1)
    ).to.be.revertedWith("E27");

    // totalNFTsSold no cambió
    expect(await ctx.presale.totalNFTsSold()).to.equal(BigInt(maxSupply));
  });
});
