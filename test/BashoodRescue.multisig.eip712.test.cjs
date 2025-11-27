if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;
const hh = require('hardhat');
const ethers = globalThis.ethers || hh.ethers;

describe("BashoodRescue - multisig EIP712 flow", function () {
  let owner, signer2, attacker, executor, alice;
  let Rescue, rescue;
  let MultiSigEIP712, multisig;

  const NAME = "MockProjectWalletMultiSigEIP712";
  const VERSION = "1";

  beforeEach(async function () {
    [owner, signer2, attacker, executor, alice] = await ethers.getSigners();
    Rescue = await ethers.getContractFactory("BashoodRescue");
    rescue = await Rescue.deploy(owner.address, alice.address);
    await rescue.waitForDeployment();
  });

  async function signExecuteClaim(signer, multisigAddr, rescueAddr, nonce) {
    const chain = await ethers.provider.getNetwork();
    const domain = {
      name: NAME,
      version: VERSION,
      chainId: Number(chain.chainId),
      verifyingContract: multisigAddr,
    };
    const types = {
      ExecuteClaim: [
        { name: 'rescue', type: 'address' },
        { name: 'nonce', type: 'uint256' }
      ]
    };
  const value = { rescue: rescueAddr, nonce: Number(nonce) };

    // signer may be a Hardhat signer that supports _signTypedData
    if (typeof signer._signTypedData === 'function') {
      return await signer._signTypedData(domain, types, value);
    }

    // Fallback: use eth_signTypedData_v4 RPC to sign typed data
    const address = await signer.getAddress();
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        ExecuteClaim: types.ExecuteClaim
      },
      primaryType: 'ExecuteClaim',
      domain: domain,
      message: value
    };

    // Note: provider.send expects params [address, data]
    const sig = await ethers.provider.send('eth_signTypedData_v4', [address, JSON.stringify(typedData)]);
    return sig;
  }

  it("happy path: N owners sign, executor calls claim -> multisig receives funds and pending zeroed", async function () {
    const multisigFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSigEIP712.sol:MockProjectWalletMultiSigEIP712");
    multisig = await multisigFactory.deploy([await owner.getAddress(), await signer2.getAddress()], 2, NAME, VERSION, false);
    await multisig.waitForDeployment();

    const multisigAddr = await multisig.getAddress();
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);

    // set project wallet to multisig
    await rescue.connect(owner).setProjectWallet(multisigAddr);

    // fund rescue
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('1') });

    // schedule withdrawal
    await rescue.connect(alice).emergencyWithdrawETH();
    const pendingBefore = await rescue.pendingWithdrawals(multisigAddr);
    expect(pendingBefore).to.be.gt(0);

    // build signatures
    const nonce = await multisig.nonces(rescueAddr);
    const sig1 = await signExecuteClaim(owner, multisigAddr, rescueAddr, nonce);
    const sig2 = await signExecuteClaim(signer2, multisigAddr, rescueAddr, nonce);

    // executor calls
    await multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1, sig2]);

    // pending should be zeroed and multisig balance increased
    const pendingAfter = await rescue.pendingWithdrawals(multisigAddr);
    expect(pendingAfter).to.equal(0);
    const msBal = await ethers.provider.getBalance(multisigAddr);
    expect(msBal).to.be.gt(0);
  });

  it("insufficient signatures: fail", async function () {
    const multisigFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSigEIP712.sol:MockProjectWalletMultiSigEIP712");
    multisig = await multisigFactory.deploy([await owner.getAddress(), await signer2.getAddress()], 2, NAME, VERSION, false);
    await multisig.waitForDeployment();

    const multisigAddr = await multisig.getAddress();
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await rescue.connect(owner).setProjectWallet(multisigAddr);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.5') });
    await rescue.connect(alice).emergencyWithdrawETH();

    const nonce = await multisig.nonces(rescueAddr);
    const sig1 = await signExecuteClaim(owner, multisigAddr, rescueAddr, nonce);
    // only one signature provided, threshold 2
    await expect(multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1])).to.be.revertedWith("Insufficient valid signatures");
  });

  it("wrong signer: fail", async function () {
    const multisigFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSigEIP712.sol:MockProjectWalletMultiSigEIP712");
    multisig = await multisigFactory.deploy([await owner.getAddress(), await signer2.getAddress()], 2, NAME, VERSION, false);
    await multisig.waitForDeployment();

    const multisigAddr = await multisig.getAddress();
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await rescue.connect(owner).setProjectWallet(multisigAddr);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.5') });
    await rescue.connect(alice).emergencyWithdrawETH();

    const nonce = await multisig.nonces(rescueAddr);
    const sig1 = await signExecuteClaim(owner, multisigAddr, rescueAddr, nonce);
    // attacker signs instead of signer2
    const badSig = await signExecuteClaim(attacker, multisigAddr, rescueAddr, nonce);
    await expect(multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1, badSig])).to.be.revertedWith("Insufficient valid signatures");
  });

  it("duplicate signatures: counted once", async function () {
    const multisigFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSigEIP712.sol:MockProjectWalletMultiSigEIP712");
    multisig = await multisigFactory.deploy([await owner.getAddress(), await signer2.getAddress()], 2, NAME, VERSION, false);
    await multisig.waitForDeployment();

    const multisigAddr = await multisig.getAddress();
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await rescue.connect(owner).setProjectWallet(multisigAddr);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.4') });
    await rescue.connect(alice).emergencyWithdrawETH();

    const nonce = await multisig.nonces(rescueAddr);
    const sig1 = await signExecuteClaim(owner, multisigAddr, rescueAddr, nonce);
    // pass same signature twice and no other signer -> should be counted once and fail
    await expect(multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1, sig1])).to.be.revertedWith("Insufficient valid signatures");
  });

  it("replay: same signatures + same nonce fails on second attempt", async function () {
    const multisigFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSigEIP712.sol:MockProjectWalletMultiSigEIP712");
    multisig = await multisigFactory.deploy([await owner.getAddress(), await signer2.getAddress()], 2, NAME, VERSION, false);
    await multisig.waitForDeployment();

    const multisigAddr = await multisig.getAddress();
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await rescue.connect(owner).setProjectWallet(multisigAddr);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.6') });
    await rescue.connect(alice).emergencyWithdrawETH();

    const nonce = await multisig.nonces(rescueAddr);
    const sig1 = await signExecuteClaim(owner, multisigAddr, rescueAddr, nonce);
    const sig2 = await signExecuteClaim(signer2, multisigAddr, rescueAddr, nonce);

    // first execution succeeds
    await multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1, sig2]);

    // second execution with same signatures and same nonce should fail due to invalid nonce
    await expect(multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1, sig2])).to.be.revertedWith("Multisig: invalid nonce");
  });

  it("revert on transfer: ensure state preserved when claim reverts", async function () {
    // deploy multisig that reverts on receive
    const multisigFactory = await ethers.getContractFactory("contracts/mocks/MockProjectWalletMultiSigEIP712.sol:MockProjectWalletMultiSigEIP712");
    // pass revertOnReceive = true
    multisig = await multisigFactory.deploy([await owner.getAddress(), await signer2.getAddress()], 2, NAME, VERSION, true);
    await multisig.waitForDeployment();

    const multisigAddr = await multisig.getAddress();
    const rescueAddr = rescue.getAddress ? await rescue.getAddress() : (rescue.address || rescue.target);
    await rescue.connect(owner).setProjectWallet(multisigAddr);
    await owner.sendTransaction({ to: rescueAddr, value: ethers.parseEther('0.7') });
    await rescue.connect(alice).emergencyWithdrawETH();

    const nonce = await multisig.nonces(rescueAddr);
    const sig1 = await signExecuteClaim(owner, multisigAddr, rescueAddr, nonce);
    const sig2 = await signExecuteClaim(signer2, multisigAddr, rescueAddr, nonce);

    // execution should revert due to multisig revert-on-receive; nonce must remain unchanged and pending preserved
    await expect(multisig.connect(executor).executeClaimWithSignatures(rescueAddr, nonce, [sig1, sig2])).to.be.reverted;

    const pending = await rescue.pendingWithdrawals(multisigAddr);
    expect(pending).to.be.gt(0);
    const nonceAfter = await multisig.nonces(rescueAddr);
    expect(nonceAfter).to.equal(nonce);
  });
});






