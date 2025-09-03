const { ethers } = require('hardhat');

async function deployPresale(opts = {}) {
  const [owner, projectWallet, buyer] = await ethers.getSigners();

  // Factories (fully-qualified to avoid ambiguous artifacts)
  const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
  // allow overriding which BHT/mock token to deploy for specialized tests
  const MockBashoodToken = await ethers.getContractFactory('contracts/MockBashoodToken.sol:MockBashoodToken');
  const bhtFactoryName = opts.bhtFactory || 'contracts/MockBashoodToken.sol:MockBashoodToken';
  const bhtArgs = opts.bhtArgs || [];
  const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
  const MockPriceFeed = await ethers.getContractFactory('contracts/MockPriceFeed.sol:MockPriceFeed');
  const BashoodReferral = await ethers.getContractFactory('contracts/BashoodReferral.sol:BashoodReferral');

  // Deploy mocks
  const BHTFactory = await ethers.getContractFactory(bhtFactoryName);
  const bht = bhtArgs.length ? await BHTFactory.deploy(...bhtArgs) : await BHTFactory.deploy();
  await bht.waitForDeployment();
  const nft = await MockNFT.deploy();
  await nft.waitForDeployment();
  const price = await MockPriceFeed.deploy(ethers.parseUnits('1', 8), 8);
  await price.waitForDeployment();
  // BashoodReferral constructor expects (presaleAddress, validator, nftContract)
  // allow overriding the referral factory (useful to inject a permissive mock)
  const referralFactoryName = opts.referralFactory || 'contracts/BashoodReferral.sol:BashoodReferral';
  const ReferralFactory = await ethers.getContractFactory(referralFactoryName);
  const referral = await ReferralFactory.deploy(owner.address, owner.address, nft.target);
  await referral.waitForDeployment();

  // Deploy presale: prefer sending the raw deploy tx (getDeployTransaction) because
  // coverage instrumentation can produce very large init bytecode that some providers
  // reject; sending the unsigned tx via owner.sendTransaction avoids the provider
  // constructor size check in certain setups.
  let presale;
  try {
    const unsigned = await BashoodPresaleFinal.getDeployTransaction(
      bht.target,
      nft.target,
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'),
      ethers.parseUnits('10', 18),
      0,
      0,
      100
    );
    const tx = await owner.sendTransaction({ data: unsigned.data });
    const receipt = await tx.wait();
    const addr = receipt.contractAddress;
    presale = await ethers.getContractAt('BashoodPresaleFinal', addr);
  } catch (err) {
    // If the unsigned path fails, fall back to normal deploy.
    presale = await BashoodPresaleFinal.deploy(
      bht.target, // bht
      nft.target, // nft
      referral.target,
      projectWallet.address,
      ethers.parseEther('0.1'), // nftPriceETH
      ethers.parseUnits('10', 18), // nftPriceBHT
      0,
      0,
      100
    );
    await presale.waitForDeployment();
  }

  return { owner, projectWallet, buyer, presale, bht, nft, price, referral };
}

async function setPriceFresh(priceContract, priceInt) {
  // set both price and updatedAt to chain block timestamp
  const block = await ethers.provider.getBlock('latest');
  await priceContract.setPrice(priceInt);
  await priceContract.setUpdatedAt(block.timestamp);
  // mine to ensure timestamp is visible
  await ethers.provider.send('evm_mine');
}

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

module.exports = { deployPresale, setPriceFresh, signNonce };
