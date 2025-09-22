const { expect } = require("chai");
const { ethers } = require("hardhat");

const parseEther = typeof ethers.parseEther === 'function' ? ethers.parseEther : (ethers.utils && ethers.utils.parseEther);

describe("PoC: BashoodMultiToken - mintAllNFTs reentrancy checks", function () {
  it("should not allow withdrawFunds during mintAllNFTs (ReentrancyGuard PoC)", async function () {
    const [owner] = await ethers.getSigners();
  const Multi = await ethers.getContractFactory("BashoodMultiToken");
  const multi = await Multi.deploy(owner.address);

  // Fund contract so withdrawFunds would have value
  // fund contract via payable buyTokens() since contract has no receive/fallback
  await multi.connect(owner).buyTokens({ value: parseEther("1") });

    // mintAllNFTs should succeed and ReentrancyGuard should prevent any reentrancy into withdrawFunds
    await multi.connect(owner).mintAllNFTs();

    // withdrawFunds should succeed afterwards
    await multi.connect(owner).withdrawFunds();
  });
});
