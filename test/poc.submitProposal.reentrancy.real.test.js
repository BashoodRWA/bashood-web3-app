const { expect } = require("chai");
const { ethers } = require("hardhat");

const parseUnits = typeof ethers.parseUnits === 'function' ? ethers.parseUnits : (ethers.utils && ethers.utils.parseUnits);

describe("PoC real: BashoodPresaleFinal.submitProposal against MaliciousBHT", function () {
  it("attempts reentry via burnFrom on the real contract", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy mocks needed by the real presale
    const MockNFT = await ethers.getContractFactory("contracts/mocks/MockNFT1155.sol:MockNFT1155");
    const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const MockReferral = await ethers.getContractFactory("contracts/mocks/MockReferral.sol:MockReferral");
    const MaliciousBHT = await ethers.getContractFactory("contracts/mocks/MaliciousBHT.sol:MaliciousBHT");

  const nft = await MockNFT.deploy();
  const price = await MockPriceFeed.deploy(8, parseUnits ? parseUnits('1', 8) : ethers.utils.parseUnits('1', 8));
  const ZERO = "0x0000000000000000000000000000000000000000";
  const referral = await MockReferral.deploy(ZERO, ZERO, nft.address);
    const mal = await MaliciousBHT.deploy();

    // Deploy real presale contract
    const BashoodPresaleFinal = await ethers.getContractFactory("contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal");
    const unsigned = await BashoodPresaleFinal.getDeployTransaction(
      mal.getAddress ? await mal.getAddress() : mal.address,
      nft.getAddress ? await nft.getAddress() : nft.address,
      referral.getAddress ? await referral.getAddress() : referral.address,
      owner.address,
      1, // nftPriceETH
      1, // nftPriceBHT
      1, // presaleStart
      9999999999, // presaleEnd
      100 // maxNFTSupply
    );
    const tx = await owner.sendTransaction({ data: unsigned.data });
    const receipt = await tx.wait();
    const presaleAddr = receipt.contractAddress;
    const presale = await ethers.getContractAt('BashoodPresaleFinal', presaleAddr);

    // configure presale
    await presale.setPriceFeed(price.getAddress ? await price.getAddress() : price.address);
    await presale.setMaxPriceStaleness(100000);
    await presale.setOperationsWallet(owner.address);

    // Fund presale with NFTs
    await nft.mint(presaleAddr, 1, 10);

    // Give attacker tokens and approve presale
    await mal.mint(attacker.address, parseUnits ? parseUnits('100', 18) : ethers.utils.parseUnits('100', 18));
    const malAsAttacker = mal.connect(attacker);
    await malAsAttacker.approve(presaleAddr, parseUnits ? parseUnits('50', 18) : ethers.utils.parseUnits('50', 18));

    // point malicious token at the real presale
    await mal.setTarget(presaleAddr);

    // Call submitProposal as attacker; if reentrancy occurs the malicious counter will reflect nested calls
    const presaleAsAttacker = presale.connect(attacker);
    await presaleAsAttacker.submitProposal("0x", 1);

    const counter = await mal.counter();
    // Record results for the test run; non-reentrant or reorder should prevent nested state changes
    expect(counter).to.be.greaterThan(0);

    // Check nextProposalId advanced exactly once (resilience indicator)
    const nextId = await presale.nextProposalId();
    expect(nextId).to.equal(2);
  });
});
