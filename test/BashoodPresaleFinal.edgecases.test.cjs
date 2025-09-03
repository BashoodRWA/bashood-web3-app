// use centralized setup provided by test/setup.js
const expect = globalThis._chai_expect;
const ethers = globalThis.ethers;
// lazy getter: prefer globalThis._presaleHelpers but fall back to requiring helpers at runtime
const getPresaleHelpers = () => globalThis._presaleHelpers || require('./helpers/presaleHelpers');
const { setPriceFresh, signNonce } = getPresaleHelpers();

describe("BashoodPresaleFinal - edge cases", function () {
  let owner, buyer, projectWallet;

  // Use shared helper from global setup

  it("reverts E14 when nftId not allowed (ETH)", async function () {
  const { presale, mockNFT } = await getPresaleHelpers().deployPresale();

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
    await expect(
      presale.connect(buyer).purchaseWithETH(3, 1, nonce, signature, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('E14');
  });

  it("reverts E17 when maxPerUser exceeded (ETH)", async function () {
  const { presale, mockNFT } = await getPresaleHelpers().deployPresale();
    // transfer some tokens so presale can sell
    const ownerAddr = await owner.getAddress();
    const presaleAddr = await presale.getAddress();
    await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

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
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 2, nonce, signature, { value: ethers.parseEther('0.2') })
    ).to.be.revertedWith('E17');
  });

  it("reverts E16 when presale lacks NFT stock (ETH)", async function () {
  const { presale } = await getPresaleHelpers().deployPresale();
    // do NOT transfer NFTs to presale
    await presale.connect(owner).startPresale();

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
      presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('E16');
  });

  it("reverts E13 when reusing nonce (ETH)", async function () {
  const { presale, mockNFT } = await getPresaleHelpers().deployPresale();
    const ownerAddr = await owner.getAddress();
    const presaleAddr = await presale.getAddress();
    await mockNFT.connect(owner).safeTransferFrom(ownerAddr, presaleAddr, 1, 10, "0x");

    await presale.connect(owner).startPresale();

    const nonce = 400;
    const buyerAddr = await buyer.getAddress();
    const messageHash = ethers.keccak256(
      ethers.concat([
        ethers.getBytes(buyerAddr),
        ethers.getBytes(ethers.toBeHex(nonce, 32))
      ])
    );
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    // first purchase should succeed
    await presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther('0.1') });

    // second attempt with same nonce should revert E13
    await expect(
      presale.connect(buyer).purchaseWithETH(1, 1, nonce, signature, { value: ethers.parseEther('0.1') })
    ).to.be.revertedWith('E13');
  });

});
