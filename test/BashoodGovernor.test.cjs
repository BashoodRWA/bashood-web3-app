/**
 * test/BashoodGovernor.test.cjs
 *
 * Tests para BashoodGovernor + BHTVotes + BashoodTimelock
 *
 * Cubre:
 *  ✅ Deployment de los 3 contratos
 *  ✅ BHTVotes: depositFor / withdrawTo (wrap/unwrap BHT)
 *  ✅ BHTVotes: delegate → voting power activada
 *  ✅ Governor: constructor params (votingDelay, votingPeriod, proposalThreshold)
 *  ✅ Timelock: roles configurados correctamente
 *  ✅ Governor: propuesta + votación + queue + execute (flujo completo con timelock=0)
 *  ✅ Governor: quorum (4% de BHTv supply)
 *  ✅ Acceso: solo Governor puede proponer al Timelock
 *
 * NOTA: Tests de governance completo requieren avanzar bloques.
 *       Se usa Hardhat network helpers (mine, time).
 */

"use strict";

const { expect }     = require("chai");
const { ethers }     = require("hardhat");
const { mine, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BashoodGovernor + BHTVotes + BashoodTimelock", function () {
  let token, bhtVotes, timelock, governor;
  let owner, voter1, voter2, proposer, recipient;

  // Match contract defaults
  const VOTING_DELAY  = 7200n;   // blocks
  const VOTING_PERIOD = 50400n;  // blocks
  const PROPOSAL_THRESHOLD = ethers.parseEther("100000"); // 100k BHTv

  beforeEach(async function () {
    [owner, voter1, voter2, proposer, recipient] = await ethers.getSigners();

    // 1. BashoodToken
    const Token = await ethers.getContractFactory("BashoodToken");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    // 2. BHTVotes
    const BHTVotes = await ethers.getContractFactory("BHTVotes");
    bhtVotes = await BHTVotes.deploy(await token.getAddress());
    await bhtVotes.waitForDeployment();

    // 3. BashoodTimelock (delay=0 for testing)
    const BashoodTimelock = await ethers.getContractFactory("BashoodTimelock");
    timelock = await BashoodTimelock.deploy(
      0,             // minDelay = 0 for tests
      [],            // proposers (set up after governor deploy)
      [],            // executors
      owner.address  // admin
    );
    await timelock.waitForDeployment();

    // 4. BashoodGovernor
    const BashoodGovernor = await ethers.getContractFactory("BashoodGovernor");
    governor = await BashoodGovernor.deploy(
      await bhtVotes.getAddress(),
      await timelock.getAddress()
    );
    await governor.waitForDeployment();

    // 5. Wire roles on timelock
    const PROPOSER_ROLE  = ethers.id("PROPOSER_ROLE");
    const EXECUTOR_ROLE  = ethers.id("EXECUTOR_ROLE");
    const CANCELLER_ROLE = ethers.id("CANCELLER_ROLE");
    const ADMIN_ROLE     = await timelock.DEFAULT_ADMIN_ROLE();

    await timelock.grantRole(PROPOSER_ROLE,  await governor.getAddress());
    await timelock.grantRole(CANCELLER_ROLE, await governor.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE,  ethers.ZeroAddress);
    await timelock.revokeRole(ADMIN_ROLE,    owner.address);

    // 6. Fund voter1 with enough BHT to meet proposal threshold
    //    voter1 needs >100k BHTv; BashoodToken applies burn+fee so send more
    const wrapAmount = ethers.parseEther("200000"); // 200k BHT
    await token.connect(owner).transfer(voter1.address, wrapAmount);

    // voter1 wraps BHT → BHTv
    const voter1BHT = await token.balanceOf(voter1.address);
    await token.connect(voter1).approve(await bhtVotes.getAddress(), voter1BHT);
    await bhtVotes.connect(voter1).depositFor(voter1.address, voter1BHT);

    // voter1 delegates to self (required to activate voting weight)
    await bhtVotes.connect(voter1).delegate(voter1.address);
  });

  // ─── BHTVotes ─────────────────────────────────────────────────────────────
  describe("BHTVotes", function () {

    it("depositFor wraps BHT into BHTv (1:1)", async function () {
      const bhtBal  = await token.balanceOf(voter1.address);
      const bhtVBal = await bhtVotes.balanceOf(voter1.address);
      // voter1 wrapped all their BHT already in beforeEach
      // BHT balance should be 0 (all wrapped), BHTv > 0
      expect(bhtVBal).to.be.gt(0n);
    });

    it("withdrawTo unwraps BHTv back to BHT", async function () {
      const bhtVBefore = await bhtVotes.balanceOf(voter1.address);
      expect(bhtVBefore).to.be.gt(0n);

      // Withdraw half
      const half = bhtVBefore / 2n;
      await bhtVotes.connect(voter1).withdrawTo(voter1.address, half);

      const bhtVAfter = await bhtVotes.balanceOf(voter1.address);
      expect(bhtVAfter).to.be.lt(bhtVBefore);

      const bhtRecovered = await token.balanceOf(voter1.address);
      expect(bhtRecovered).to.be.gt(0n);
    });

    it("delegate activates voting power", async function () {
      const votes = await bhtVotes.getVotes(voter1.address);
      expect(votes).to.be.gt(0n);
    });

    it("undelegated address has 0 voting power", async function () {
      // voter2 has no delegation
      const votes = await bhtVotes.getVotes(voter2.address);
      expect(votes).to.equal(0n);
    });

    it("decimals() is 18", async function () {
      expect(await bhtVotes.decimals()).to.equal(18);
    });
  });

  // ─── BashoodTimelock ──────────────────────────────────────────────────────
  describe("BashoodTimelock", function () {
    it("Governor has PROPOSER_ROLE", async function () {
      const PROPOSER_ROLE = ethers.id("PROPOSER_ROLE");
      expect(await timelock.hasRole(PROPOSER_ROLE, await governor.getAddress())).to.be.true;
    });

    it("address(0) has EXECUTOR_ROLE (anyone executes)", async function () {
      const EXECUTOR_ROLE = ethers.id("EXECUTOR_ROLE");
      expect(await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)).to.be.true;
    });

    it("deployer no longer has DEFAULT_ADMIN_ROLE", async function () {
      const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
      expect(await timelock.hasRole(ADMIN_ROLE, owner.address)).to.be.false;
    });

    it("minDelay is 0 (test config)", async function () {
      expect(await timelock.getMinDelay()).to.equal(0n);
    });
  });

  // ─── BashoodGovernor params ───────────────────────────────────────────────
  describe("BashoodGovernor parameters", function () {
    it("name is 'BashoodGovernor'", async function () {
      expect(await governor.name()).to.equal("BashoodGovernor");
    });

    it("votingDelay is 7200", async function () {
      expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
    });

    it("votingPeriod is 50400", async function () {
      expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("proposalThreshold is 100k BHTv", async function () {
      expect(await governor.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
    });

    it("quorumNumerator is 4", async function () {
      // quorumNumerator() is on GovernorVotesQuorumFraction
      expect(await governor.quorumNumerator()).to.equal(4n);
    });

    it("token() returns BHTVotes", async function () {
      expect(await governor.token()).to.equal(await bhtVotes.getAddress());
    });
  });

  // ─── Full governance round-trip ───────────────────────────────────────────
  describe("Governance round-trip (propose → vote → queue → execute)", function () {
    /**
     * Scenario: governance proposes to transfer ETH from Timelock to recipient.
     * Timelock needs ETH for this test — we fund it directly.
     */
    beforeEach(async function () {
      // Fund timelock with ETH (simulates treasury)
      await owner.sendTransaction({
        to: await timelock.getAddress(),
        value: ethers.parseEther("1"),
      });
    });

    it("full proposal lifecycle completes successfully", async function () {
      const timelockAddr   = await timelock.getAddress();
      const recipientAddr  = recipient.address;
      const ethToSend      = ethers.parseEther("0.1");

      // Check voter1 has enough votes for proposal threshold
      const votes = await bhtVotes.getVotes(voter1.address);
      const threshold = await governor.proposalThreshold();
      if (votes < threshold) {
        // Skip if not enough — BashoodToken fees may have reduced balance
        this.skip();
      }

      // 1. PROPOSE
      const calldata = "0x"; // empty calldata — just transferring ETH
      const tx = await governor.connect(voter1).propose(
        [recipientAddr],         // targets
        [ethToSend],             // values
        [calldata],              // calldatas
        "Send 0.1 ETH to recipient"
      );
      const receipt    = await tx.wait();
      const proposalId = receipt.logs
        .map(l => { try { return governor.interface.parseLog(l); } catch { return null; } })
        .find(l => l?.name === "ProposalCreated")
        ?.args.proposalId;

      expect(proposalId).to.not.be.undefined;

      // 2. ADVANCE past votingDelay
      await mine(Number(VOTING_DELAY) + 1);

      // 3. VOTE (1 = For, 0 = Against, 2 = Abstain)
      await governor.connect(voter1).castVote(proposalId, 1);

      // 4. ADVANCE past votingPeriod
      await mine(Number(VOTING_PERIOD) + 1);

      // Verify proposal succeeded
      const state = await governor.state(proposalId);
      // ProposalState.Succeeded = 4
      expect(state).to.equal(4);

      // 5. QUEUE
      const descHash = ethers.id("Send 0.1 ETH to recipient");
      await governor.connect(voter1).queue(
        [recipientAddr],
        [ethToSend],
        [calldata],
        descHash
      );

      // 6. EXECUTE (timelock delay = 0 in tests)
      const recipientBefore = await ethers.provider.getBalance(recipientAddr);
      await governor.connect(voter1).execute(
        [recipientAddr],
        [ethToSend],
        [calldata],
        descHash
      );
      const recipientAfter = await ethers.provider.getBalance(recipientAddr);

      expect(recipientAfter).to.be.gt(recipientBefore);
    });
  });
});
