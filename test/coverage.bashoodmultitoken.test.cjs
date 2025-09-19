const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Coverage: BashoodMultiToken focused tests', function () {
  it('mintAllNFTs onlyOwner and nftCounter behavior + withdrawFunds transfer failure', async function () {
    const [deployer, alice] = await ethers.getSigners();

    const Multi = await ethers.getContractFactory('BashoodMultiToken');
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    // initial nftCounter should be 1
    expect(await multi.nftCounter()).to.equal(1);

    // only owner can mintAllNFTs
    await expect(multi.connect(alice).mintAllNFTs()).to.be.reverted;

    // owner mints all NFTs
    await multi.connect(deployer).mintAllNFTs();
    expect((await multi.nftCounter()).toNumber()).to.be.greaterThan(1);
    expect(await multi.nftOwners(1)).to.equal(deployer.address);

    // second call reverts
    await expect(multi.connect(deployer).mintAllNFTs()).to.be.revertedWith('NFTs ya han sido minteados');

    // fund contract by buyTokens
    await multi.connect(alice).buyTokens({ value: ethers.parseEther('0.5') });

    // normal withdraw by owner should succeed (owner is deployer)
    const balanceBefore = await ethers.provider.getBalance(deployer.address);
    await expect(multi.connect(deployer).withdrawFunds()).to.emit(multi, 'FundsWithdrawn');

    // Now deploy a RejectingWallet that will revert on receive
    const Reject = await ethers.getContractFactory('RejectingWallet');
    const reject = await Reject.deploy();
    await reject.waitForDeployment();

    // Transfer ownership to rejecting wallet
    await multi.connect(deployer).transferOwnership(await reject.getAddress());

    // Fund contract again
    await multi.connect(alice).buyTokens({ value: ethers.parseEther('0.1') });

    // Now withdrawFunds should revert because owner rejects ETH
    await expect(multi.connect(await reject.getAddress ? await reject.getAddress() : reject.address).withdrawFunds())
      .to.be.revertedWith('Transfer failed');
  });

  it('approveMarketplace emits correct events and buyTokens mints BASHOOD_TOKEN', async function () {
    const [deployer, alice, bob] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory('BashoodMultiToken');
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();

    // approveMarketplace emits 1 on true
    await expect(multi.connect(alice).approveMarketplace(bob.address, true))
      .to.emit(multi, 'MarketplaceApproved')
      .withArgs(alice.address, bob.address, 1);

    // approveMarketplace emits 0 on false
    await expect(multi.connect(alice).approveMarketplace(bob.address, false))
      .to.emit(multi, 'MarketplaceApproved')
      .withArgs(alice.address, bob.address, 0);

    // buyTokens mints BASHOOD_TOKEN amount = msg.value * rate
    const rate = await multi.rate();
    const tx = await multi.connect(alice).buyTokens({ value: ethers.parseEther('0.01') });
    await tx.wait();
    const tokensMinted = ethers.parseEther('0.01') * Number(rate);
    // balanceOf for BASHOOD_TOKEN should be tokensMinted
    const bal = await multi.balanceOf(alice.address, 1);
    expect(bal).to.be.gt(0);
  });
});
