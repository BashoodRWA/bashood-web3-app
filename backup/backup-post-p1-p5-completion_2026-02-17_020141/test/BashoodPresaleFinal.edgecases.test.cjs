// use centralized setup provided by test/setup.js
const expect = (globalThis._chai_expect || require('chai').expect);
const ethers = globalThis.ethers;
// lazy getter: prefer globalThis._presaleHelpers but fall back to requiring helpers at runtime
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - edge cases", function () {
  let owner, buyer, projectWallet;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, buyer, projectWallet] = signers;
  });

  // Use shared helper from global setup

  it("reverts E14 when nftId not allowed (ETH)", async function () {
  const d = await getPresaleHelpers().deployPresale();
  const { presale, nft } = d;
  owner = d.owner; buyer = d.buyer; projectWallet = d.projectWallet;

  await presale.connect(owner).setSigner(await owner.getAddress());
  await presale.connect(owner).startPresale();

  // create a valid signature (signed by the configured signer = owner)
    const nonce = 100;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

  // nftId 3 is not allowed by default -> should revert E14
    const nftPrice = await presale.nftPriceETH();
    await expect(
      presale.connect(buyer).purchaseWithETH(3, 1, nonce, signature, { value: nftPrice })
    ).to.be.revertedWith('E14');
  });

  it("reverts E17 when maxPerUser exceeded (ETH)", async function () {
  const d = await getPresaleHelpers().deployPresale();
  const { presale, nft } = d;
  // mint and transfer some tokens so presale can sell
  const ownerAddr = await d.owner.getAddress();
  const presaleAddr = await presale.getAddress();
  await nft.connect(d.owner).mint(ownerAddr, 1, 10);
  await nft.connect(d.owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

  await presale.connect(owner).setSigner(await owner.getAddress());
  await presale.connect(owner).startPresale();

    const nonce = 200;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    // attempt to buy 2 when default maxPerUser is 1 -> E17
    const nftPrice = await presale.nftPriceETH();
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 2, nonce, signature, { value: nftPrice * 2n })
    ).to.be.revertedWith('E17');
  });

  it("reverts E16 when presale lacks NFT stock (ETH)", async function () {
  const d = await getPresaleHelpers().deployPresale();
  const { presale } = d;
  // do NOT transfer NFTs to presale (test expects presale to have zero stock)
  await presale.connect(d.owner).setSigner(await d.owner.getAddress());
  await presale.connect(d.owner).startPresale();

    const nonce = 300;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    // allowed id 1 but presale has zero balance -> E16
    await expect(
  presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther('0.01') })
    ).to.be.revertedWith('E16');
  });

  it("reverts E13 when reusing nonce (ETH)", async function () {
  const d = await getPresaleHelpers().deployPresale();
  const { presale, nft } = d;
  const ownerAddr = await d.owner.getAddress();
  const presaleAddr = await presale.getAddress();
  // ensure owner has tokens to transfer to presale
  await nft.connect(d.owner).mint(ownerAddr, 1, 10);
  await nft.connect(d.owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

  await presale.connect(d.owner).setSigner(await d.owner.getAddress());
  await presale.connect(d.owner).startPresale();

    const nonce = 400;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    // first purchase should succeed (use contract's nftPriceETH to avoid mismatches)
    const price = await presale.nftPriceETH();
    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: price });

    // second attempt with same nonce should revert E13
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: price })
    ).to.be.revertedWith('E13');
    try { await nft.mint(presaleAddr, 1, 5); } catch (e) { /* ignore if already minted */ }
  });

});






