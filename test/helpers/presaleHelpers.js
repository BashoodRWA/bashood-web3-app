const hh = require('hardhat');
// Some tests run in CommonJS and set a global ethers (via hardhat runtime). Prefer
// using that when present to avoid TDZ / initialization order issues in CJS tests.
const ethers = globalThis.ethers || hh.ethers;

async function deployPresale(opts = {}) {
  const signers = await ethers.getSigners();
  const owner = signers[0];
  // allow caller to override projectWallet with a provided address or signer
  let projectWallet = signers[1];
  if (opts.projectWallet) {
    if (typeof opts.projectWallet === 'string') {
      // wrap a minimal signer-like object when only an address was provided
      projectWallet = { address: opts.projectWallet, getAddress: async () => opts.projectWallet };
    } else if (typeof opts.projectWallet.getAddress === 'function') {
      projectWallet = opts.projectWallet;
    }
  }
  const buyer = signers[2];

  // Factories (fully-qualified to avoid ambiguous artifacts)
  const BashoodPresaleFinal = await ethers.getContractFactory('contracts/BashoodPresaleFinal.sol:BashoodPresaleFinal');
  // allow overriding which BHT/mock token to deploy for specialized tests
  const bhtFactoryName = opts.bhtFactory || 'contracts/MockBashoodToken.sol:MockBashoodToken';
  const bhtArgs = opts.bhtArgs || [];
  const MockNFT = await ethers.getContractFactory('contracts/mocks/MockNFT1155.sol:MockNFT1155');
  const MockPriceFeed = await ethers.getContractFactory('contracts/mocks/MockPriceFeed.sol:MockPriceFeed');
  
  // If caller passed existing contract addresses, use them instead of deploying new mocks.
  let bht, nft, price, referral;
  if (opts.bhtAddr) {
  bht = { getAddress: async () => opts.bhtAddr };
  }
  if (opts.nftAddr) {
  nft = { getAddress: async () => opts.nftAddr };
  }

  // Deploy mocks if they were not provided by the caller
  if (!bht) {
    const BHTFactory = await ethers.getContractFactory(bhtFactoryName);
    bht = bhtArgs.length ? await BHTFactory.deploy(...bhtArgs) : await BHTFactory.deploy();
    await bht.waitForDeployment();
  }
  if (!nft) {
    nft = await MockNFT.deploy();
    await nft.waitForDeployment();
  }
  // price feed is cheap to deploy and tests expect one - allow override via opts.priceAddr in future if needed
  // MockPriceFeed (contracts/mocks/MockPriceFeed.sol) constructor is (uint8 _decimals, int256 _answer)
  // deploy with decimals first, then answer
  price = await MockPriceFeed.deploy(8, ethers.parseUnits('1', 8));
  await price.waitForDeployment();

  // Compatibility shims: some older tests expect the alternative MockPriceFeed API
  // found elsewhere in the repo (setPrice / setUpdatedAt). Add thin wrappers so
  // both styles work against the deployed mock without editing production code.
  if (typeof price.setPrice !== 'function') {
    price.setPrice = async function (newAnswer) {
      return this.setAnswer(newAnswer);
    };
  }
  if (typeof price.setUpdatedAt !== 'function') {
    price.setUpdatedAt = async function (ts) {
      // read current answer and call setAnswerWithTimestamp if available
      if (typeof this.setAnswerWithTimestamp === 'function') {
        const current = await this.answer();
        return this.setAnswerWithTimestamp(current, ts);
      }
      // fallback: update internal updatedAt by re-setting the answer
      const current2 = await this.answer();
      return this.setAnswer(current2);
    };
  }

  // BashoodReferral constructor expects (presaleAddress, validator, nftContract)
  // allow overriding the referral address if provided
  if (opts.referralAddr) {
  referral = { getAddress: async () => opts.referralAddr };
  } else {
    const referralFactoryName = opts.referralFactory || 'contracts/BashoodReferral.sol:BashoodReferral';
    const ReferralFactory = await ethers.getContractFactory(referralFactoryName);
  // ensure we pass the NFT address string
  const nftAddrForReferral = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
  referral = await ReferralFactory.deploy(owner.address, owner.address, nftAddrForReferral);
    await referral.waitForDeployment();
  }

  // Deploy presale: prefer sending the raw deploy tx (getDeployTransaction) because
  // coverage instrumentation can produce very large init bytecode that some providers
  // reject; sending the unsigned tx via owner.sendTransaction avoids the provider
  // constructor size check in certain setups.
  let presale;
  try {
    const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
    const nftAddr = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
    const referralAddr = (typeof referral.getAddress === 'function') ? await referral.getAddress() : referral.address;
    const projectWalletAddr = (typeof projectWallet === 'string') ? projectWallet : (projectWallet.getAddress ? await projectWallet.getAddress() : projectWallet.address);

    const unsigned = await BashoodPresaleFinal.getDeployTransaction(
      bhtAddr,
      nftAddr,
      referralAddr,
      projectWalletAddr,
      ethers.parseEther('0.01'), // nftPriceETH default (smaller to match tests)
      ethers.parseUnits('1', 18), // nftPriceBHT default (1 BHT)
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
    const bhtAddr = (typeof bht.getAddress === 'function') ? await bht.getAddress() : bht.address;
    const nftAddr = (typeof nft.getAddress === 'function') ? await nft.getAddress() : nft.address;
    const referralAddr = (typeof referral.getAddress === 'function') ? await referral.getAddress() : referral.address;
    const projectWalletAddr = (typeof projectWallet === 'string') ? projectWallet : (projectWallet.getAddress ? await projectWallet.getAddress() : projectWallet.address);

    presale = await BashoodPresaleFinal.deploy(
      bhtAddr,
      nftAddr,
      referralAddr,
      projectWalletAddr,
      ethers.parseEther('0.01'), // nftPriceETH (default adjusted)
      ethers.parseUnits('1', 18), // nftPriceBHT (default adjusted)
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
  // MockPriceFeed exposes setAnswer and setAnswerWithTimestamp
  if (typeof priceContract.setAnswerWithTimestamp === 'function') {
    await priceContract.setAnswerWithTimestamp(priceInt, block.timestamp);
  } else {
    await priceContract.setAnswer(priceInt);
    if (typeof priceContract.setUpdatedAt === 'function') {
      await priceContract.setUpdatedAt(block.timestamp);
    }
  }
  // mine to ensure timestamp is visible
  await ethers.provider.send('evm_mine');
}

function signNonce(signer, userAddress, nonce) {
  const hash = ethers.solidityPackedKeccak256(['address','uint256'], [userAddress, nonce]);
  return signer.signMessage(ethers.getBytes(hash));
}

module.exports = { deployPresale, setPriceFresh, signNonce };
