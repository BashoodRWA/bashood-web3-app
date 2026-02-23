const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const PAUSE_DELAY = 24 * 60 * 60; // 24 hours in seconds

describe("BashoodToken - Comprehensive Coverage Tests", function () {
  // Fixture para deployment optimizado
  async function deployBashoodTokenFixture() {
    const [owner, treasury, staking, user1, user2, user3] = await ethers.getSigners();

    const BashoodToken = await ethers.getContractFactory("BashoodToken");
    const token = await BashoodToken.deploy(treasury.address);
    await token.waitForDeployment();

    return { token, owner, treasury, staking, user1, user2, user3 };
  }

  describe("🔥 Configuración Inicial", function () {
    it("Debe deployar con parámetros correctos", async function () {
      const { token, owner, treasury } = await loadFixture(deployBashoodTokenFixture);

      expect(await token.name()).to.equal("BashoodToken");
      expect(await token.symbol()).to.equal("BHT");
      expect(await token.treasuryWallet()).to.equal(treasury.address);
      expect(await token.burnRate()).to.equal(10); // 0.1%
      expect(await token.treasuryFee()).to.equal(50); // 0.5%
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Debe revertir si treasury es address(0)", async function () {
      const BashoodToken = await ethers.getContractFactory("BashoodToken");
      await expect(
        BashoodToken.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Treasury required");
    });

    it("Debe mintear supply inicial al owner", async function () {
      const { token, owner } = await loadFixture(deployBashoodTokenFixture);
      const expectedSupply = ethers.parseEther("1000000000");
      expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
    });
  });

  describe("💸 Transfer con Fees y Burn", function () {
    it("Debe aplicar burnRate y treasuryFee en transfer", async function () {
      const { token, owner, treasury, user1 } = await loadFixture(deployBashoodTokenFixture);

      const amount = ethers.parseEther("1000");
      const burnAmount = (amount * 10n) / 10000n; // 0.1%
      const feeAmount = (amount * 50n) / 10000n; // 0.5%
      const sendAmount = amount - burnAmount - feeAmount;

      await expect(token.transfer(user1.address, amount))
        .to.emit(token, "TokensBurned")
        .withArgs(owner.address, burnAmount)
        .and.to.emit(token, "FeeToTreasury")
        .withArgs(owner.address, feeAmount);

      expect(await token.balanceOf(user1.address)).to.equal(sendAmount);
      expect(await token.balanceOf(treasury.address)).to.equal(feeAmount);
      expect(await token.totalBurned()).to.equal(burnAmount);
      expect(await token.totalToTreasury()).to.equal(feeAmount);
    });

    it("Debe revertir transfer con amount = 0", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.transfer(user1.address, 0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Debe aplicar fees en transferFrom", async function () {
      const { token, owner, user1, user2, treasury } = await loadFixture(deployBashoodTokenFixture);

      const amount = ethers.parseEther("1000");
      await token.transfer(user1.address, amount);

      const allowance = ethers.parseEther("500");
      await token.connect(user1).approve(user2.address, allowance);

      const transferAmount = ethers.parseEther("100");
      const burnAmount = (transferAmount * 10n) / 10000n;
      const feeAmount = (transferAmount * 50n) / 10000n;
      const sendAmount = transferAmount - burnAmount - feeAmount;

      const initialBurned = await token.totalBurned();
      const initialToTreasury = await token.totalToTreasury();

      await token.connect(user2).transferFrom(user1.address, user2.address, transferAmount);

      expect(await token.totalBurned()).to.equal(initialBurned + burnAmount);
      expect(await token.totalToTreasury()).to.equal(initialToTreasury + feeAmount);
    });

    it("Debe revertir transferFrom con amount = 0", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployBashoodTokenFixture);

      const amount = ethers.parseEther("100");
      await token.transfer(user1.address, amount);
      await token.connect(user1).approve(user2.address, amount);

      await expect(
        token.connect(user2).transferFrom(user1.address, user2.address, 0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Debe manejar transferFrom sin allowance suficiente", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployBashoodTokenFixture);

      const amount = ethers.parseEther("100");
      await token.transfer(user1.address, amount);

      await expect(
        token.connect(user2).transferFrom(user1.address, user2.address, amount)
      ).to.be.reverted; // ERC20InsufficientAllowance
    });
  });

  describe("🎁 Donaciones", function () {
    it("Debe aceptar donaciones y actualizar totalDonated", async function () {
      const { token, owner, user1 } = await loadFixture(deployBashoodTokenFixture);

      const donationAmount = ethers.parseEther("100");
      await token.transfer(user1.address, ethers.parseEther("200"));

      await expect(token.connect(user1).donate(donationAmount))
        .to.emit(token, "DonationReceived")
        .withArgs(user1.address, donationAmount);

      expect(await token.totalDonated()).to.equal(donationAmount);
      expect(await token.balanceOf(await token.getAddress())).to.be.gt(0);
    });

    it("Debe revertir donación con amount = 0", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user1).donate(0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Debe revertir donación sin balance suficiente", async function () {
      const { token, user3 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user3).donate(ethers.parseEther("1"))
      ).to.be.reverted; // ERC20InsufficientBalance
    });
  });

  describe("🔥 Burn Manual", function () {
    it("Debe permitir burn manual y actualizar totalBurned", async function () {
      const { token, owner, user1 } = await loadFixture(deployBashoodTokenFixture);

      const burnAmount = ethers.parseEther("1000");
      await token.transfer(user1.address, ethers.parseEther("2000"));

      const initialBurned = await token.totalBurned();

      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(user1.address, burnAmount);

      expect(await token.totalBurned()).to.equal(initialBurned + burnAmount);
    });

    it("Debe revertir burn sin balance suficiente", async function () {
      const { token, user3 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user3).burn(ethers.parseEther("1"))
      ).to.be.reverted; // ERC20InsufficientBalance
    });
  });

  describe("🏦 Periodic Burn (Owner Only)", function () {
    it("Debe permitir periodicBurn al owner con balance suficiente", async function () {
      const { token, owner } = await loadFixture(deployBashoodTokenFixture);

      // Donar al contrato
      await token.donate(ethers.parseEther("1000"));

      const burnAmount = ethers.parseEther("100");
      const initialBurned = await token.totalBurned();

      await expect(token.periodicBurn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(await token.getAddress(), burnAmount);

      expect(await token.totalBurned()).to.equal(initialBurned + burnAmount);
    });

    it("Debe revertir periodicBurn si no hay balance suficiente", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.periodicBurn(ethers.parseEther("1"))
      ).to.be.revertedWith("Not enough tokens to burn");
    });

    it("Debe revertir periodicBurn si no es owner", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await token.donate(ethers.parseEther("100"));

      await expect(
        token.connect(user1).periodicBurn(ethers.parseEther("10"))
      ).to.be.reverted; // OwnableUnauthorizedAccount
    });
  });

  describe("💰 Send to Treasury/Staking", function () {
    it("Debe permitir sendToTreasury con balance suficiente", async function () {
      const { token, treasury } = await loadFixture(deployBashoodTokenFixture);

      await token.donate(ethers.parseEther("1000"));

      const sendAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(treasury.address);

      await token.sendToTreasury(sendAmount);

      expect(await token.balanceOf(treasury.address)).to.equal(initialBalance + sendAmount);
    });

    it("Debe revertir sendToTreasury sin balance suficiente", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.sendToTreasury(ethers.parseEther("1"))
      ).to.be.revertedWith("Not enough tokens");
    });

    it("Debe revertir sendToStaking si staking no está configurado", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await token.donate(ethers.parseEther("100"));

      await expect(
        token.sendToStaking(ethers.parseEther("10"))
      ).to.be.revertedWith("Staking contract not set");
    });

    it("Debe permitir sendToStaking después de configurar staking", async function () {
      const { token, staking } = await loadFixture(deployBashoodTokenFixture);

      await token.setStakingContract(staking.address);
      await token.donate(ethers.parseEther("1000"));

      const sendAmount = ethers.parseEther("100");
      await token.sendToStaking(sendAmount);

      expect(await token.balanceOf(staking.address)).to.equal(sendAmount);
    });

    it("Debe revertir sendToStaking sin balance suficiente", async function () {
      const { token, staking } = await loadFixture(deployBashoodTokenFixture);
      await token.setStakingContract(staking.address);

      await expect(
        token.sendToStaking(ethers.parseEther("1"))
      ).to.be.revertedWith("Not enough tokens");
    });

    it("Debe revertir sendToTreasury si no es owner", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await token.donate(ethers.parseEther("100"));

      await expect(
        token.connect(user1).sendToTreasury(ethers.parseEther("10"))
      ).to.be.reverted;
    });

    it("Debe revertir sendToStaking si no es owner", async function () {
      const { token, user1, staking } = await loadFixture(deployBashoodTokenFixture);
      await token.setStakingContract(staking.address);
      await token.donate(ethers.parseEther("100"));

      await expect(
        token.connect(user1).sendToStaking(ethers.parseEther("10"))
      ).to.be.reverted;
    });
  });

  describe("⚙️ Configuración - Treasury Wallet", function () {
    it("Debe actualizar treasuryWallet correctamente", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);

      await expect(token.setTreasuryWallet(user1.address))
        .to.emit(token, "TreasuryWalletChanged");

      expect(await token.treasuryWallet()).to.equal(user1.address);
    });

    it("Debe revertir setTreasuryWallet con address(0)", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.setTreasuryWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Debe revertir setTreasuryWallet si no es owner", async function () {
      const { token, user1, user2 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user1).setTreasuryWallet(user2.address)
      ).to.be.reverted;
    });
  });

  describe("⚙️ Configuración - Staking Contract", function () {
    it("Debe actualizar stakingContract correctamente", async function () {
      const { token, staking } = await loadFixture(deployBashoodTokenFixture);

      await expect(token.setStakingContract(staking.address))
        .to.emit(token, "StakingContractChanged");

      expect(await token.stakingContract()).to.equal(staking.address);
    });

    it("Debe revertir setStakingContract con address(0)", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.setStakingContract(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Debe revertir setStakingContract si no es owner", async function () {
      const { token, user1, staking } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user1).setStakingContract(staking.address)
      ).to.be.reverted;
    });
  });

  describe("⚙️ Configuración - Burn Rate", function () {
    it("Debe actualizar burnRate correctamente", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);

      const newRate = 50; // 0.5%
      await expect(token.setBurnRate(newRate))
        .to.emit(token, "BurnRateChanged")
        .withArgs(10, newRate);

      expect(await token.burnRate()).to.equal(newRate);
    });

    it("Debe revertir setBurnRate si excede MAX_BURN_RATE", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.setBurnRate(101)
      ).to.be.revertedWith("Max 1% burn");
    });

    it("Debe permitir burnRate = 0", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await token.setBurnRate(0);
      expect(await token.burnRate()).to.equal(0);
    });

    it("Debe permitir burnRate = 100 (máximo)", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await token.setBurnRate(100);
      expect(await token.burnRate()).to.equal(100);
    });

    it("Debe revertir setBurnRate si no es owner", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user1).setBurnRate(20)
      ).to.be.reverted;
    });
  });

  describe("⚙️ Configuración - Treasury Fee", function () {
    it("Debe actualizar treasuryFee correctamente", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);

      const newFee = 100; // 1%
      await expect(token.setTreasuryFee(newFee))
        .to.emit(token, "TreasuryFeeChanged")
        .withArgs(50, newFee);

      expect(await token.treasuryFee()).to.equal(newFee);
    });

    it("Debe revertir setTreasuryFee si excede MAX_TREASURY_FEE", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.setTreasuryFee(201)
      ).to.be.revertedWith("Max 2% fee");
    });

    it("Debe permitir treasuryFee = 0", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await token.setTreasuryFee(0);
      expect(await token.treasuryFee()).to.equal(0);
    });

    it("Debe permitir treasuryFee = 200 (máximo)", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await token.setTreasuryFee(200);
      expect(await token.treasuryFee()).to.equal(200);
    });

    it("Debe revertir setTreasuryFee si no es owner", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user1).setTreasuryFee(100)
      ).to.be.reverted;
    });
  });

  describe("⏸️ Pause/Unpause", function () {
    it("Debe pausar el contrato correctamente (timelock)", async function () {
      const { token } = await loadFixture(deployBashoodTokenFixture);
      await token.requestPause();
      await time.increase(PAUSE_DELAY);
      await token.executePause();
      expect(await token.paused()).to.be.true;
    });

    it("Debe revertir operaciones cuando está pausado", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await token.requestPause();
      await time.increase(PAUSE_DELAY);
      await token.executePause();

      await expect(
        token.transfer(user1.address, ethers.parseEther("1"))
      ).to.be.reverted; // EnforcedPause

      await expect(
        token.burn(ethers.parseEther("1"))
      ).to.be.reverted;

      await expect(
        token.donate(ethers.parseEther("1"))
      ).to.be.reverted;
    });

    it("Debe despausar el contrato correctamente (timelock)", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      // Pause first
      await token.requestPause();
      await time.increase(PAUSE_DELAY);
      await token.executePause();
      // Now unpause
      await token.requestUnpause();
      await time.increase(PAUSE_DELAY);
      await token.executeUnpause();
      expect(await token.paused()).to.be.false;

      // Debe permitir operaciones
      await expect(
        token.transfer(user1.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Debe revertir requestPause si no es owner", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await expect(
        token.connect(user1).requestPause()
      ).to.be.reverted;
    });

    it("Debe revertir requestUnpause si no es owner", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);
      await token.requestPause();
      await time.increase(PAUSE_DELAY);
      await token.executePause();
      await expect(
        token.connect(user1).requestUnpause()
      ).to.be.reverted;
    });
  });

  describe("🧮 Edge Cases - Fees con BurnRate Extremo", function () {
    it("Debe manejar burnRate=100 (1%) correctamente", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);

      await token.setBurnRate(100); // 1%

      const amount = ethers.parseEther("1000");
      const burnAmount = (amount * 100n) / 10000n; // 10 tokens
      const feeAmount = (amount * 50n) / 10000n; // 5 tokens
      const sendAmount = amount - burnAmount - feeAmount; // 985 tokens

      await token.transfer(user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(sendAmount);
      expect(await token.totalBurned()).to.equal(burnAmount);
    });

    it("Debe manejar treasuryFee=200 (2%) correctamente", async function () {
      const { token, user1, treasury } = await loadFixture(deployBashoodTokenFixture);

      await token.setTreasuryFee(200); // 2%

      const amount = ethers.parseEther("1000");
      const burnAmount = (amount * 10n) / 10000n; // 1 token
      const feeAmount = (amount * 200n) / 10000n; // 20 tokens
      const sendAmount = amount - burnAmount - feeAmount; // 979 tokens

      await token.transfer(user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(sendAmount);
      expect(await token.totalToTreasury()).to.equal(feeAmount);
    });

    it("Debe manejar burnRate=0 y treasuryFee=0", async function () {
      const { token, user1 } = await loadFixture(deployBashoodTokenFixture);

      await token.setBurnRate(0);
      await token.setTreasuryFee(0);

      const amount = ethers.parseEther("1000");
      await token.transfer(user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(amount);
      expect(await token.totalBurned()).to.equal(0);
      expect(await token.totalToTreasury()).to.equal(0);
    });
  });

  describe("🔄 Integración - Múltiples Operaciones", function () {
    it("Debe acumular totalBurned correctamente en múltiples operaciones", async function () {
      const { token, user1, user2 } = await loadFixture(deployBashoodTokenFixture);

      const amount = ethers.parseEther("1000");

      // Transfer 1
      await token.transfer(user1.address, amount);
      const burn1 = await token.totalBurned();

      // Transfer 2
      await token.transfer(user2.address, amount);
      const burn2 = await token.totalBurned();

      expect(burn2).to.be.gt(burn1);

      // Burn manual
      await token.connect(user1).burn(ethers.parseEther("100"));
      const burn3 = await token.totalBurned();

      expect(burn3).to.equal(burn2 + ethers.parseEther("100"));
    });

    it("Debe acumular totalToTreasury correctamente", async function () {
      const { token, user1, user2, treasury } = await loadFixture(deployBashoodTokenFixture);

      const amount = ethers.parseEther("1000");

      await token.transfer(user1.address, amount);
      const treasury1 = await token.totalToTreasury();

      await token.transfer(user2.address, amount);
      const treasury2 = await token.totalToTreasury();

      expect(treasury2).to.be.gt(treasury1);
    });
  });
});
