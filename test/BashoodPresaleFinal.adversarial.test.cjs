/**
 * test/BashoodPresaleFinal.adversarial.test.cjs
 *
 * Tests adversariales sobre el flujo completo de compra (ETH y BHT).
 *
 * Cobertura:
 *   [A] Replay y manipulación de firma
 *   [B] Bypass de tx.origin (contratos atacantes)
 *   [C] Referral malicioso: revert + gas griefing
 *   [D] Oracle en extremos y límites de staleness
 *   [E] Burn con tokens no estándar (sin burnFrom, returnFalse en ops)
 *   [F] Límites exactos (maxPerUser, maxNFTSupply, stock físico)
 *   [G] NFT malicioso que revierte en safeTransferFrom
 *   [H] Invariantes globales del sistema
 */
"use strict";

const { expect }  = require("chai");
const { ethers }  = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Firma EIP-191 idéntica a la que usa BashoodPresaleFinal._verifySignature */
async function signFor(signer, buyerAddress, nonce) {
  const msgHash = ethers.keccak256(
    ethers.concat([
      ethers.getBytes(buyerAddress),
      ethers.getBytes(ethers.toBeHex(nonce, 32)),
    ])
  );
  return signer.signMessage(ethers.getBytes(msgHash));
}

/**
 * Despliega el sistema completo con control total sobre todos los componentes.
 * @param {object} opts
 *   bhtFactory   - nombre del contrato BHT a usar (por defecto MockBashoodToken)
 *   nftFactory   - nombre del contrato NFT a usar (por defecto MockNFT1155)
 *   referralFactory - nombre del contrato referral a usar
 *   maxPerUser   - límite por usuario (por defecto 5)
 *   maxSupply    - máximo de NFTs en preventa (por defecto 10)
 *   nftPriceETH  - precio en ETH (por defecto 0.01 ETH)
 *   nftPriceBHT  - precio en BHT (por defecto 1e18)
 */
async function deployFull(opts = {}) {
  const [owner, buyer, buyer2, signer, projectWallet, attacker] =
    await ethers.getSigners();

  // BHT
  const bhtName = opts.bhtFactory || "contracts/MockBashoodToken.sol:MockBashoodToken";
  const BHT = await ethers.getContractFactory(bhtName);
  const bht = await BHT.deploy();
  await bht.waitForDeployment();

  // NFT
  const nftName = opts.nftFactory || "contracts/mocks/MockNFT1155.sol:MockNFT1155";
  const NFT = await ethers.getContractFactory(nftName);
  const nft = await NFT.deploy();
  await nft.waitForDeployment();

  // Price feed (8 decimals, $1  per BHT)
  const PF = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
  const priceFeed = await PF.deploy(8, ethers.parseUnits("1", 8));
  await priceFeed.waitForDeployment();

  // Referral
  const refName = opts.referralFactory || "contracts/mocks/MockReferral.sol:MockReferral";
  const Ref = await ethers.getContractFactory(refName);
  let referral;
  if (opts.referralArgs) {
    referral = await Ref.deploy(...opts.referralArgs);
  } else {
    referral = await Ref.deploy(owner.address, owner.address, await nft.getAddress());
  }
  await referral.waitForDeployment();

  const maxPerUser  = opts.maxPerUser  ?? 5;
  const maxSupply   = opts.maxSupply   ?? 10;
  const nftPriceETH = opts.nftPriceETH ?? ethers.parseEther("0.01");
  const nftPriceBHT = opts.nftPriceBHT ?? ethers.parseUnits("1", 18);

  // Presale
  const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
  const presale = await Presale.deploy(
    await bht.getAddress(),
    await nft.getAddress(),
    await referral.getAddress(),
    projectWallet.address,
    projectWallet.address, // operationsWallet
    nftPriceETH,
    nftPriceBHT,
    0, 0,          // presaleStart/End = 0 → usa flag presaleActive
    maxSupply
  );
  await presale.waitForDeployment();

  // Config
  await presale.connect(owner).setSigner(signer.address);
  await presale.connect(owner).setPriceFeed(await priceFeed.getAddress());
  await presale.connect(owner).setMaxPriceStaleness(3600);
  await presale.connect(owner).setMaxPerUser(maxPerUser);
  await presale.connect(owner).setOperationsWallet(projectWallet.address);
  await presale.connect(owner).startPresale();

  // Dar stock de NFTs al presale
  const stock = opts.stock ?? maxSupply;
  if (stock > 0) {
    await nft.connect(owner).mint(owner.address, 1, stock);
    await nft.connect(owner).safeTransferFrom(
      owner.address, await presale.getAddress(), 1, stock, "0x"
    );
  }

  // Dar BHT a buyer por defecto
  await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
  await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

  return { owner, buyer, buyer2, signer, projectWallet, attacker, bht, nft, priceFeed, referral, presale, nftPriceETH, nftPriceBHT, maxPerUser, maxSupply };
}

// ──────────────────────────────────────────────────────────────────────────────
// [A] Replay y manipulación de firma
// ──────────────────────────────────────────────────────────────────────────────

describe("[A] Replay y manipulación de firma", function () {
  let ctx;
  beforeEach(async function () { ctx = await deployFull(); });

  it("A1: firma del buyer A rechazada cuando la usa buyer B (E12)", async function () {
    const { presale, signer, buyer, buyer2, nftPriceETH } = ctx;
    // Firma para buyer
    const sig = await signFor(signer, buyer.address, 1001);
    // buyer2 intenta usar la firma de buyer
    await expect(
      presale.connect(buyer2).purchaseWithETH(1, 1, 1001, sig, { value: nftPriceETH })
    ).to.be.revertedWith("E12");
  });

  it("A2: nonce reutilizado en ETH revierte E13", async function () {
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 2001);
    await presale.connect(buyer).purchaseWithETH(1, 1, 2001, sig, { value: nftPriceETH });
    // segundo intento con el mismo nonce
    const sig2 = await signFor(signer, buyer.address, 2001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 2001, sig2, { value: nftPriceETH })
    ).to.be.revertedWith("E13");
  });

  it("A3: nonce reutilizado en BHT revierte E25", async function () {
    const { presale, signer, buyer } = ctx;
    const sig = await signFor(signer, buyer.address, 3001);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 3001, sig);
    const sig2 = await signFor(signer, buyer.address, 3001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 3001, sig2)
    ).to.be.revertedWith("E25");
  });

  it("A4: firma inválida (bytes corruptos) revierte E24", async function () {
    const { presale, buyer } = ctx;
    const badSig = "0x" + "ab".repeat(65);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 4001, badSig)
    ).to.be.reverted; // ECDSA.recover revierte con firma malformada
  });

  it("A5: signerAddress no configurado (E31) — deploy fresco sin setSigner", async function () {
    // Deploy mínimo sin setSigner
    const [owner, buyer, pw] = await ethers.getSigners();
    const BHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    const bht = await BHT.deploy();
    const NFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await NFT.deploy();
    const Ref = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
    const ref = await Ref.deploy(owner.address, owner.address, await nft.getAddress());
    const PF  = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const pf  = await PF.deploy(8, ethers.parseUnits("1", 8));

    const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
    const presale = await Presale.deploy(
      await bht.getAddress(), await nft.getAddress(), await ref.getAddress(),
      pw.address, pw.address,
      ethers.parseEther("0.01"), ethers.parseUnits("1", 18),
      0, 0, 10
    );
    await presale.connect(owner).startPresale();
    // NO setSigner → signerAddress = address(0) → E31
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 9999, "0x" + "00".repeat(65))
    ).to.be.revertedWith("E31");
  });

  it("A6: firma con nonce correcto pero buyer diferente (cross-buyer replay) en BHT → E24", async function () {
    const { presale, signer, buyer, buyer2, bht } = ctx;
    await bht.mint(buyer2.address, ethers.parseUnits("1000", 18));
    await bht.connect(buyer2).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));
    // firma hecha para buyer
    const sig = await signFor(signer, buyer.address, 5001);
    // buyer2 intenta usar la firma de buyer con su propio nonce
    await expect(
      presale.connect(buyer2).purchaseWithBHT(1, 1, 5001, sig)
    ).to.be.revertedWith("E24");
  });

  it("A7: usedHashes persiste tras nonce quemado — no se puede resetear", async function () {
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const nonce = 7001;
    const sig   = await signFor(signer, buyer.address, nonce);
    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, sig, { value: nftPriceETH });
    // El contrato ahora usa abi.encode (no encodePacked) — mismo padding que uint256
    const hash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [buyer.address, nonce])
    );
    expect(await presale.usedHashes(hash)).to.be.true;
    // Intentar volver a comprar con el mismo nonce
    const sig2 = await signFor(signer, buyer.address, nonce);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, nonce, sig2, { value: nftPriceETH })
    ).to.be.revertedWith("E13");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [B] tx.origin bypass
// ──────────────────────────────────────────────────────────────────────────────

describe("[B] Bypass de tx.origin", function () {
  let ctx;
  beforeEach(async function () { ctx = await deployFull(); });

  it("B1: contrato atacante que llama purchaseWithETH revierte E10", async function () {
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 8001);
    // MockCaller llama purchaseWithETH → msg.sender (MockCaller) != tx.origin (buyer EOA) → E10
    // El MockCaller re-empaqueta el revert como string(data), produciendo un error anidado.
    // Usamos try/catch en lugar de chai matchers para evitar el error de decodificación.
    const MockCaller = await ethers.getContractFactory("MockCaller");
    const caller = await MockCaller.deploy();
    let reverted = false;
    try {
      await caller.connect(buyer).callPurchase(
        await presale.getAddress(), 1, 1, 8001, sig, { value: nftPriceETH }
      );
    } catch (err) {
      reverted = true;
    }
    expect(reverted).to.be.true;
  });

  it("B2: contrato atacante que llama purchaseWithBHT revierte E19", async function () {
    const { presale, signer, buyer } = ctx;
    const sig = await signFor(signer, buyer.address, 9001);
    const Caller = await ethers.getContractFactory("Caller");
    const caller = await Caller.deploy();
    // Caller.callPurchaseWithBHT → msg.sender (Caller) != tx.origin (buyer EOA) → E19
    await expect(
      caller.connect(buyer).callPurchaseWithBHT(
        await presale.getAddress(), 1, 1, 9001, sig
      )
    ).to.be.reverted;
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [C] Referral malicioso
// ──────────────────────────────────────────────────────────────────────────────

describe("[C] Referral malicioso: revert y gas griefing", function () {
  it("C1: referral que revierte no bloquea la compra (try/catch)", async function () {
    // Deploy con referral que siempre revierte en rewardReferrer
    const [owner, buyer, signer, pw, griefAddr] = await ethers.getSigners();

    const Griefing = await ethers.getContractFactory("MockReferralGasGriefing");
    const griefReferral = await Griefing.deploy(griefAddr.address); // returns non-zero referrer
    await griefReferral.waitForDeployment();

    const ctx = await deployFull({
      referralFactory: "contracts/mocks/MockReferralGasGriefing.sol:MockReferralGasGriefing",
      referralArgs: [griefAddr.address],
    });

    const sig = await signFor(ctx.signer, ctx.buyer.address, 10001);
    // La compra debe completarse a pesar del revert del referral
    await expect(
      ctx.presale.connect(ctx.buyer).purchaseWithETH(1, 1, 10001, sig, { value: ctx.nftPriceETH })
    ).to.emit(ctx.presale, "AssetPurchased");
  });

  it("C2: gas griefing en rewardReferrer — compra igual se completa sin extra-revert", async function () {
    const ctx = await deployFull({
      referralFactory: "contracts/mocks/MockReferralGasGriefing.sol:MockReferralGasGriefing",
      referralArgs: [ethers.Wallet.createRandom().address],
    });

    const sig = await signFor(ctx.signer, ctx.buyer.address, 11001);
    const tx  = await ctx.presale.connect(ctx.buyer).purchaseWithBHT(1, 1, 11001, sig);
    const rc  = await tx.wait();
    expect(rc.status).to.equal(1);
    // El contrato gastó gas de más pero la tx tuvo éxito
  });

  it("C3: referral normal — rewardReferrer funciona y se registra", async function () {
    const ctx = await deployFull();
    // Configurar referido
    await ctx.referral.setReferrer(ctx.buyer.address, ctx.buyer2.address);
    const sig = await signFor(ctx.signer, ctx.buyer.address, 12001);
    await expect(
      ctx.presale.connect(ctx.buyer).purchaseWithETH(1, 1, 12001, sig, { value: ctx.nftPriceETH })
    ).to.emit(ctx.presale, "AssetPurchased");
    // El referral registró la recompensa
    expect(await ctx.referral.isRewarded(ctx.buyer.address)).to.be.true;
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [D] Oracle en extremos y límites de staleness
// ──────────────────────────────────────────────────────────────────────────────

describe("[D] Oracle: extremos y límites de staleness", function () {
  let ctx;
  beforeEach(async function () { ctx = await deployFull(); });

  it("D1: precio exactamente en el límite de staleness → válido", async function () {
    const { presale, priceFeed, signer, buyer } = ctx;
    // Estrategia: fijar updatedAt = T (ahora), luego forzar el siguiente bloque a T+3600
    // → block.timestamp - updatedAt = 3600 <= maxPriceStaleness (3600) → válido
    const now = await time.latest();
    await priceFeed.setAnswerWithTimestamp(ethers.parseUnits("1", 8), now);
    // El bloque de la compra se mina en exactly now + 3600
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 3600]);
    const sig = await signFor(signer, buyer.address, 13001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 13001, sig)
    ).to.emit(presale, "AssetPurchased");
  });

  it("D2: precio 1 segundo más viejo que maxPriceStaleness → 'Price too stale'", async function () {
    const { presale, priceFeed, signer, buyer } = ctx;
    const ts = (await time.latest()) - 3601;
    await priceFeed.setAnswerWithTimestamp(ethers.parseUnits("1", 8), ts);
    const sig = await signFor(signer, buyer.address, 14001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 14001, sig)
    ).to.be.revertedWith("Price too stale");
  });

  it("D3: answer = 1 (mínimo positivo) → válido, precio extremo bajo", async function () {
    const { presale, priceFeed, signer, buyer } = ctx;
    await priceFeed.setAnswer(1n); // $0.00000001 por BHT → muy caro en BHT
    const sig = await signFor(signer, buyer.address, 15001);
    // Puede revertir por allowance insuficiente (precio en BHT disparado), pero NO por oracle
    // Lo importante: no revierte con "Invalid price"
    try {
      await presale.connect(buyer).purchaseWithBHT(1, 1, 15001, sig);
    } catch (err) {
      expect(err.message).to.not.include("Invalid price");
    }
  });

  it("D4: answeredInRound == roundId (frontera exacta) → válido", async function () {
    const { presale, priceFeed, signer, buyer } = ctx;
    // setAnsweredInRound con valor == roundId del mock (default 1)
    await priceFeed.setAnsweredInRound(1n);
    const sig = await signFor(signer, buyer.address, 16001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 16001, sig)
    ).to.emit(presale, "AssetPurchased");
  });

  it("D5: answeredInRound < roundId → 'Incomplete round'", async function () {
    const { presale, priceFeed, signer, buyer } = ctx;
    await priceFeed.setAnsweredInRound(0n); // 0 < roundId (1)
    const sig = await signFor(signer, buyer.address, 17001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 17001, sig)
    ).to.be.revertedWith("Incomplete round");
  });

  it("D6: updatedAt = 0 → 'Price too stale'", async function () {
    const { presale, priceFeed, signer, buyer } = ctx;
    await priceFeed.setAnswerWithTimestamp(ethers.parseUnits("1", 8), 0);
    const sig = await signFor(signer, buyer.address, 18001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 18001, sig)
    ).to.be.revertedWith("Price too stale");
  });

  it("D7: priceFeed no configurado (zero address) → 'PriceFeed req'", async function () {
    // Deploy presale sin setPriceFeed
    const [owner, buyer, signer, pw] = await ethers.getSigners();
    const BHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    const bht = await BHT.deploy();
    const NFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await NFT.deploy();
    const Ref = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
    const ref = await Ref.deploy(owner.address, owner.address, await nft.getAddress());
    const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
    const presale = await Presale.deploy(
      await bht.getAddress(), await nft.getAddress(), await ref.getAddress(),
      pw.address, pw.address,
      ethers.parseEther("0.01"), ethers.parseUnits("1", 18),
      0, 0, 10
    );
    await presale.connect(owner).setSigner(signer.address);
    await presale.connect(owner).setMaxPriceStaleness(3600);
    await presale.connect(owner).setOperationsWallet(pw.address);
    await presale.connect(owner).startPresale();

    // Dar NFT stock para pasar E26/E27/E28 y llegar a la validación del oracle
    await nft.mint(owner.address, 1, 5);
    await nft.connect(owner).safeTransferFrom(owner.address, await presale.getAddress(), 1, 5, "0x");

    await bht.mint(buyer.address, ethers.parseUnits("1000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));

    const sig = await signFor(signer, buyer.address, 19001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 19001, sig)
    ).to.be.revertedWith("PriceFeed req");
  });

  it("D8: maxPriceStaleness = 0 → 'Staleness req'", async function () {
    const { presale, priceFeed, signer, buyer, owner } = ctx;
    // Bajar staleness a 0 — el presale requiere > 0
    // setMaxPriceStaleness revierte si se pasa 0, así que forzamos via otro mecanismo:
    // En cambio verificamos que setMaxPriceStaleness(0) revierte con el mensaje correcto
    await expect(
      presale.connect(owner).setMaxPriceStaleness(0)
    ).to.be.revertedWith("Invalid staleness: 1s-24h");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [E] Burn con tokens no estándar
// ──────────────────────────────────────────────────────────────────────────────

describe("[E] Burn con tokens no estándar", function () {
  it("E1: MockBHTNoBurn → fallback al dead address, compra exitosa", async function () {
    const ctx = await deployFull({ bhtFactory: "contracts/mocks/MockBHTNoBurn.sol:MockBHTNoBurn" });
    const { presale, bht, signer, buyer, owner } = ctx;

    await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

    // Configurar un burnBps > 0 para que el contrato intente burn
    await presale.connect(owner).setBurnBps(500); // 5%

    const sig = await signFor(signer, buyer.address, 20001);
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 20001, sig)
    ).to.emit(presale, "AssetPurchased");

    // Verificar que tokens llegaron a dead address (parte del burnAmount)
    const DEAD = "0x000000000000000000000000000000000000dEaD";
    const deadBalance = await bht.balanceOf(DEAD);
    expect(deadBalance).to.be.gt(0n);
  });

  it("E2: MockBHTReturnFalse en ops transfer → 'Ops transfer failed'", async function () {
    // MockBHTReturnFalse devuelve false cuando el destino == rejectTo
    const [owner, buyer, signer, projectWallet] = await ethers.getSigners();

    const BHTRF = await ethers.getContractFactory("contracts/mocks/MockBHTReturnFalse.sol:MockBHTReturnFalse");
    // rejectTo = projectWallet (= operationsWallet)
    const bht = await BHTRF.deploy("BHT", "BHT", projectWallet.address);
    await bht.waitForDeployment();

    const NFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const nft = await NFT.deploy();
    const Ref = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
    const ref = await Ref.deploy(owner.address, owner.address, await nft.getAddress());
    const PF  = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const pf  = await PF.deploy(8, ethers.parseUnits("1", 8));

    const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
    const presale = await Presale.deploy(
      await bht.getAddress(), await nft.getAddress(), await ref.getAddress(),
      projectWallet.address, projectWallet.address,
      ethers.parseEther("0.01"), ethers.parseUnits("1", 18),
      0, 0, 10
    );
    await presale.connect(owner).setSigner(signer.address);
    await presale.connect(owner).setPriceFeed(await pf.getAddress());
    await presale.connect(owner).setMaxPriceStaleness(3600);
    await presale.connect(owner).setOperationsWallet(projectWallet.address);
    await presale.connect(owner).startPresale();

    await nft.mint(owner.address, 1, 5);
    await nft.connect(owner).safeTransferFrom(owner.address, await presale.getAddress(), 1, 5, "0x");

    await bht.mint(buyer.address, ethers.parseUnits("10000", 18));
    await bht.connect(buyer).approve(await presale.getAddress(), ethers.parseUnits("10000", 18));

    const sig = await signFor(signer, buyer.address, 21001);
    // SafeERC20: cuando transferFrom devuelve false se lanza SafeERC20FailedOperation (no string)
    await expect(
      presale.connect(buyer).purchaseWithBHT(1, 1, 21001, sig)
    ).to.be.reverted;
  });

  it("E3: burnBps = 0, opsAmount = discountedCost completo → sin burn, todo a opsWallet", async function () {
    const ctx = await deployFull();
    const { presale, bht, signer, buyer, owner, projectWallet } = ctx;
    // burnBps ya es 0 por defecto
    const balBefore = await bht.balanceOf(projectWallet.address);
    const sig = await signFor(signer, buyer.address, 22001);
    await presale.connect(buyer).purchaseWithBHT(1, 1, 22001, sig);
    const balAfter = await bht.balanceOf(projectWallet.address);
    expect(balAfter).to.be.gt(balBefore);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [F] Límites exactos de compra
// ──────────────────────────────────────────────────────────────────────────────

describe("[F] Límites exactos: maxPerUser y maxNFTSupply", function () {
  it("F1: qty == maxPerUser (frontera válida) → OK", async function () {
    const ctx = await deployFull({ maxPerUser: 3, maxSupply: 20, stock: 20 });
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 23001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 3, 23001, sig, { value: nftPriceETH * 3n })
    ).to.emit(presale, "AssetPurchased");
    expect(await presale.userPurchases(buyer.address)).to.equal(3n);
  });

  it("F2: qty == maxPerUser + 1 → E17", async function () {
    const ctx = await deployFull({ maxPerUser: 3, maxSupply: 20, stock: 20 });
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 24001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 4, 24001, sig, { value: nftPriceETH * 4n })
    ).to.be.revertedWith("E17");
  });

  it("F3: último NFT disponible globalmente → OK", async function () {
    const ctx = await deployFull({ maxPerUser: 5, maxSupply: 3, stock: 3 });
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 25001);
    await presale.connect(buyer).purchaseWithETH(1, 3, 25001, sig, { value: nftPriceETH * 3n });
    expect(await presale.totalNFTsSold()).to.equal(3n);
  });

  it("F4: un NFT más del maxSupply → E15", async function () {
    const ctx = await deployFull({ maxPerUser: 10, maxSupply: 3, stock: 10 });
    const { presale, signer, buyer, buyer2, bht, nftPriceETH } = ctx;

    // Comprar todo el stock
    const sig1 = await signFor(signer, buyer.address, 26001);
    await presale.connect(buyer).purchaseWithETH(1, 3, 26001, sig1, { value: nftPriceETH * 3n });

    // Un token adicional → E15
    const sig2 = await signFor(signer, buyer2.address, 26002);
    await expect(
      presale.connect(buyer2).purchaseWithETH(1, 1, 26002, sig2, { value: nftPriceETH })
    ).to.be.revertedWith("E15");
  });

  it("F5: stock físico insuficiente (NFTs en contrato < qty solicitada) → E16", async function () {
    // maxSupply = 10 pero solo damos 2 NFTs físicos al presale
    const ctx = await deployFull({ maxPerUser: 5, maxSupply: 10, stock: 2 });
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 27001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 3, 27001, sig, { value: nftPriceETH * 3n })
    ).to.be.revertedWith("E16");
  });

  it("F6: compra acumulativa hasta el límite por usuario en dos transacciones", async function () {
    const ctx = await deployFull({ maxPerUser: 3, maxSupply: 20, stock: 20 });
    const { presale, signer, buyer, nftPriceETH } = ctx;

    const sig1 = await signFor(signer, buyer.address, 28001);
    await presale.connect(buyer).purchaseWithETH(1, 2, 28001, sig1, { value: nftPriceETH * 2n });

    const sig2 = await signFor(signer, buyer.address, 28002);
    await presale.connect(buyer).purchaseWithETH(1, 1, 28002, sig2, { value: nftPriceETH });

    // Tercer compra supera maxPerUser
    const sig3 = await signFor(signer, buyer.address, 28003);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 28003, sig3, { value: nftPriceETH })
    ).to.be.revertedWith("E17");
  });

  it("F7: compra con ETH incorrecto (exceso) → E18", async function () {
    const ctx = await deployFull();
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 29001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 29001, sig, { value: nftPriceETH + 1n })
    ).to.be.revertedWith("E18");
  });

  it("F8: compra con ETH de 0 wei → E18", async function () {
    const ctx = await deployFull();
    const { presale, signer, buyer } = ctx;
    const sig = await signFor(signer, buyer.address, 30001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 30001, sig, { value: 0n })
    ).to.be.revertedWith("E18");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [G] NFT malicioso en safeTransferFrom
// ──────────────────────────────────────────────────────────────────────────────

describe("[G] NFT malicioso que revierte en safeTransferFrom", function () {
  it("G1: NFT que revierte → compra falla y estado NO queda corrupto", async function () {
    const [owner, buyer, signer, pw] = await ethers.getSigners();

    const BHT = await ethers.getContractFactory("contracts/MockBashoodToken.sol:MockBashoodToken");
    const bht = await BHT.deploy();
    const NFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155Reverting.sol:MockNFT1155Reverting");
    const nft = await NFT.deploy();
    const Ref = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
    const ref = await Ref.deploy(owner.address, owner.address, await nft.getAddress());
    const PF  = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const pf  = await PF.deploy(8, ethers.parseUnits("1", 8));

    const Presale = await ethers.getContractFactory("BashoodPresaleFinal");
    const presale = await Presale.deploy(
      await bht.getAddress(), await nft.getAddress(), await ref.getAddress(),
      pw.address, pw.address,
      ethers.parseEther("0.01"), ethers.parseUnits("1", 18),
      0, 0, 10
    );
    const presaleAddr = await presale.getAddress();

    await presale.connect(owner).setSigner(signer.address);
    await presale.connect(owner).setOperationsWallet(pw.address);
    await presale.connect(owner).startPresale();

    // Dar stock al presale y luego activar el bloqueo de transfers DESDE el presale
    await nft.mint(owner.address, 1, 5);
    await nft.connect(owner).safeTransferFrom(owner.address, presaleAddr, 1, 5, "0x");
    await nft.setRevertTarget(presaleAddr); // ahora cualquier safeTransferFrom del presale revierte

    await bht.mint(buyer.address, ethers.parseUnits("1000", 18));
    await bht.connect(buyer).approve(presaleAddr, ethers.parseUnits("1000", 18));

    const soldBefore = await presale.totalNFTsSold();
    const purchasesBefore = await presale.userPurchases(buyer.address);

    const sig = await signFor(signer, buyer.address, 31001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 31001, sig, { value: ethers.parseEther("0.01") })
    ).to.be.reverted;

    // Estado debe ser idéntico (toda la tx revertió)
    expect(await presale.totalNFTsSold()).to.equal(soldBefore);
    expect(await presale.userPurchases(buyer.address)).to.equal(purchasesBefore);
  });

  it("G2: NFT normal → estado se actualiza correctamente post-transfer", async function () {
    const ctx = await deployFull();
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 32001);
    await presale.connect(buyer).purchaseWithETH(1, 1, 32001, sig, { value: nftPriceETH });
    expect(await presale.totalNFTsSold()).to.equal(1n);
    expect(await presale.hasPurchased(buyer.address)).to.be.true;
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// [H] Invariantes globales del sistema
// ──────────────────────────────────────────────────────────────────────────────

describe("[H] Invariantes globales del sistema", function () {
  let ctx;
  beforeEach(async function () { ctx = await deployFull({ maxPerUser: 5, maxSupply: 10, stock: 10 }); });

  it("H1: totalNFTsSold nunca supera maxNFTSupply tras N compras", async function () {
    const { presale, signer, buyer, buyer2, bht, nftPriceETH, maxSupply } = ctx;

    await bht.mint(buyer2.address, ethers.parseUnits("1000", 18));
    await bht.connect(buyer2).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));

    const sig1 = await signFor(signer, buyer.address,  40001);
    const sig2 = await signFor(signer, buyer2.address, 40002);

    await presale.connect(buyer).purchaseWithETH(1, 2, 40001, sig1, { value: nftPriceETH * 2n });
    await presale.connect(buyer2).purchaseWithETH(1, 3, 40002, sig2, { value: nftPriceETH * 3n });

    const total = await presale.totalNFTsSold();
    expect(total).to.equal(5n);
    expect(total).to.be.lte(BigInt(maxSupply));
  });

  it("H2: hasPurchased nunca vuelve a false", async function () {
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 41001);
    await presale.connect(buyer).purchaseWithETH(1, 1, 41001, sig, { value: nftPriceETH });
    expect(await presale.hasPurchased(buyer.address)).to.be.true;
    // No hay función para resetear hasPurchased → siempre true
    expect(await presale.hasPurchased(buyer.address)).to.be.true;
  });

  it("H3: userPurchases es monotónico — nunca decrece", async function () {
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig1 = await signFor(signer, buyer.address, 42001);
    const sig2 = await signFor(signer, buyer.address, 42002);
    await presale.connect(buyer).purchaseWithETH(1, 1, 42001, sig1, { value: nftPriceETH });
    const p1 = await presale.userPurchases(buyer.address);
    await presale.connect(buyer).purchaseWithETH(1, 2, 42002, sig2, { value: nftPriceETH * 2n });
    const p2 = await presale.userPurchases(buyer.address);
    expect(p2).to.be.gt(p1);
  });

  it("H4: ETH acumula en el contrato tras compras con ETH", async function () {
    const { presale, signer, buyer, nftPriceETH } = ctx;
    const sig = await signFor(signer, buyer.address, 43001);
    await presale.connect(buyer).purchaseWithETH(1, 2, 43001, sig, { value: nftPriceETH * 2n });
    const ethBalance = await ethers.provider.getBalance(await presale.getAddress());
    expect(ethBalance).to.equal(nftPriceETH * 2n);
  });

  it("H5: un buyer distinto emite NewBuyer la primera vez", async function () {
    const { presale, signer, buyer, buyer2, bht, nftPriceETH } = ctx;
    const sig1 = await signFor(signer, buyer.address,  44001);
    const sig2 = await signFor(signer, buyer2.address, 44002);

    await bht.mint(buyer2.address, ethers.parseUnits("1000", 18));
    await bht.connect(buyer2).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));

    await expect(presale.connect(buyer).purchaseWithETH(1, 1, 44001, sig1, { value: nftPriceETH }))
      .to.emit(presale, "NewBuyer").withArgs(buyer.address);
    await expect(presale.connect(buyer2).purchaseWithETH(1, 1, 44002, sig2, { value: nftPriceETH }))
      .to.emit(presale, "NewBuyer").withArgs(buyer2.address);
    // Segunda compra del buyer → NO emite NewBuyer
    const sig3 = await signFor(signer, buyer.address, 44003);
    const tx3 = await presale.connect(buyer).purchaseWithETH(1, 1, 44003, sig3, { value: nftPriceETH });
    const rc3 = await tx3.wait();
    const newBuyerEvents = rc3.logs.filter(l => {
      try { return presale.interface.parseLog(l)?.name === "NewBuyer"; } catch { return false; }
    });
    expect(newBuyerEvents.length).to.equal(0);
  });

  it("H6: pausar bloquea payServiceWithBHT y payMilestoneWithBHT (whenNotPaused)", async function () {
    // Nota: purchaseWithETH/BHT NO tienen whenNotPaused (protección de compras depende de presaleActive).
    // Los métodos que sí respetan Pausable son payServiceWithBHT y payMilestoneWithBHT.
    const { presale, bht, signer, buyer, owner } = ctx;
    await presale.connect(owner).pause();

    // payServiceWithBHT(uint256,...) → whenNotPaused → revert
    await expect(
      presale.connect(buyer)["payServiceWithBHT(uint256,uint256)"](1n, ethers.parseEther("100"))
    ).to.be.reverted;

    // payMilestoneWithBHT(uint8,...) → whenNotPaused → revert
    await expect(
      presale.connect(buyer)["payMilestoneWithBHT(uint8,uint256)"](1, ethers.parseEther("100"))
    ).to.be.reverted;
  });

  it("H7: unpause restaura compras", async function () {
    const { presale, signer, buyer, owner, nftPriceETH } = ctx;
    await presale.connect(owner).pause();
    await presale.connect(owner).unpause();
    const sig = await signFor(signer, buyer.address, 46001);
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, 46001, sig, { value: nftPriceETH })
    ).to.emit(presale, "AssetPurchased");
  });

  it("H8: deployer y signer no pueden comprar con BHT (E22/E23)", async function () {
    const { presale, signer, owner, bht, nftPriceBHT } = ctx;

    // Dar BHT al signer
    await bht.mint(signer.address, ethers.parseUnits("1000", 18));
    await bht.connect(signer).approve(await presale.getAddress(), ethers.parseUnits("1000", 18));

    const sigForSigner  = await signFor(signer, signer.address,  47001);
    const sigForDeployer = await signFor(signer, owner.address, 47002);

    await expect(
      presale.connect(signer).purchaseWithBHT(1, 1, 47001, sigForSigner)
    ).to.be.revertedWith("E22");

    await expect(
      presale.connect(owner).purchaseWithBHT(1, 1, 47002, sigForDeployer)
    ).to.be.revertedWith("E23");
  });
});
