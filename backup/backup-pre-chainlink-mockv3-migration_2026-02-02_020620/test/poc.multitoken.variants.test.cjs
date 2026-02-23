const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoC variants: BashoodMultiToken attacker receiver patterns", function () {
  it("variant: batch attacker should attempt but not succeed", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();
    const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : multi.address;
    await multi.buyTokens({ value: ethers.parseEther("1") });

    const AttBatch = await ethers.getContractFactory("AttackerBatch");
    const att = await AttBatch.deploy();
    await att.waitForDeployment();
    const attAddr = (typeof att.getAddress === 'function') ? await att.getAddress() : att.address;
  // Ensure we call setTarget explicitly from deployer (the attacker contract's deployer) to avoid permission mismatch
  await att.connect(deployer).setTarget(multiAddr);

  // Use the MINTER_ROLE (deployer) to mint a real batch (two ids) into the attacker contract so onERC1155BatchReceived runs
  // use two ids to ensure the ERC1155 batch codepath emits TransferBatch and triggers onERC1155BatchReceived
  const tx = await multi.connect(deployer).mintBatch(attAddr, [2,3], [1,1], '0x');
    const rcpt = await tx.wait();
    // Check balance to verify the mint succeeded
    const bal = await multi.balanceOf(attAddr, 2);
    console.log('post-mint bal', bal.toString());

    const attempted = await att.withdrawAttempted();
    const succeeded = await att.withdrawSucceeded();

    // If balance > 0 but attempted == false, the hook didn't run. Log receipt events for debugging.
    if (BigInt(bal.toString ? bal.toString() : bal) > 0n && !attempted) {
      console.log('Minted but hook not triggered; tx logs count:', rcpt.logs.length);
      for (let i = 0; i < rcpt.logs.length; i++) {
        try {
          const l = rcpt.logs[i];
          console.log(i, 'address', l.address, 'topics[0]', l.topics ? l.topics[0] : null, 'data', l.data);
        } catch(e) { console.log('log decode error', e); }
      }
    }

    expect(attempted).to.equal(true);
    expect(succeeded).to.equal(false);
  });

  it("variant: loop attacker should attempt multiple calls but not succeed", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();
    const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : multi.address;
    await multi.buyTokens({ value: ethers.parseEther("1") });

    const AttLoop = await ethers.getContractFactory("AttackerLoop");
    const att = await AttLoop.deploy();
    await att.waitForDeployment();
    const attAddr = (typeof att.getAddress === 'function') ? await att.getAddress() : att.address;
    await att.setTarget(multiAddr);

    // Make attacker the owner so it can call mintAllNFTs
    await multi.transferOwnership(attAddr);

    await att.attack();

    const attempts = await att.attempts();
    const successes = await att.successes();
    expect(attempts).to.be.gt(0);
    expect(successes).to.equal(0);
  });

  it("variant: conditional attacker should only act on calldata flag and fail to withdraw", async function () {
    const [deployer] = await ethers.getSigners();
    const Multi = await ethers.getContractFactory("BashoodMultiToken");
    const multi = await Multi.deploy(deployer.address);
    await multi.waitForDeployment();
    const multiAddr = (typeof multi.getAddress === 'function') ? await multi.getAddress() : multi.address;
    await multi.buyTokens({ value: ethers.parseEther("1") });

    const AttCond = await ethers.getContractFactory("AttackerConditional");
    const att = await AttCond.deploy();
    await att.waitForDeployment();
    const attAddr = (typeof att.getAddress === 'function') ? await att.getAddress() : att.address;
    await att.setTarget(multiAddr);

    // Have the minter (deployer) mint a single token to the attacker with data 0x01 so the attacker acts conditionally
    await multi.connect(deployer).mint(attAddr, 2, 1, '0x01');

    const withdrew = await att.withdrew();
    expect(withdrew).to.equal(false);
  });
});






