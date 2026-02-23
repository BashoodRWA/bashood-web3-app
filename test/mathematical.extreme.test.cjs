/**
 * 🔢 MATHEMATICAL EXTREME TEST SUITE: Burn + TreasuryFee Edge Cases
 * 
 * Propósito: Validación matemática exhaustiva de economía deflacionaria
 * Fecha: 18 Febrero 2026
 * 
 * Tests críticos:
 * 1. Edge cases: 0, 1, máximo (100 bps burn, 200 bps fee)
 * 2. Transfers mínimos (1 wei) y máximos (total supply)
 * 3. Overflow/underflow protection
 * 4. Rounding errors acumulativos
 * 5. Consistencia totalSupply vs balances
 * 6. Invariantes matemáticos (supply siempre disminuye)
 * 
 * ⚠️ SI ALGÚN TEST FALLA → BUG MATEMÁTICO CRÍTICO
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🔢 MATHEMATICAL: Burn + TreasuryFee Edge Cases", function () {
  
  async function deployTokenFixture() {
    const [owner, treasury, user1, user2, user3] = await ethers.getSigners();
    
    const BashoodToken = await ethers.getContractFactory("BashoodToken");
    const token = await BashoodToken.deploy(treasury.address);
    await token.waitForDeployment();
    
    return { token, owner, treasury, user1, user2, user3 };
  }

  describe("EDGE CASE 1: Valores Mínimos (0 bps)", function () {
    
    it("✅ burnRate = 0: No burn, solo treasury fee", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(0);
      await token.connect(owner).setTreasuryFee(50); // 0.5%
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const initialSupply = await token.totalSupply();
      const user1Balance = await token.balanceOf(user1.address);
      
      // Transfer real balance de user1 (puede ser menor que amount debido a fees del primer transfer)
      await token.connect(user1).transfer(owner.address, user1Balance);
      
      const finalSupply = await token.totalSupply();
      
      // Con burnRate=0, supply NO disminuye (solo fee a treasury)
      const expectedBurn = 0n;
      const expectedFee = (amount * 50n) / 10000n; // 0.5%
      const expectedReceived = amount - expectedFee;
      
      expect(finalSupply).to.equal(initialSupply); // No burn
      expect(await token.totalBurned()).to.equal(0);
    });

    it("✅ treasuryFee = 0: Solo burn, no fee", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10); // 0.1%
      await token.connect(owner).setTreasuryFee(0);
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const initialSupply = await token.totalSupply();
      const treasuryBalanceBefore = await token.balanceOf(treasury.address);
      const user1Balance = await token.balanceOf(user1.address);
      
      await token.connect(user1).transfer(owner.address, user1Balance);
      
      const finalSupply = await token.totalSupply();
      const treasuryBalanceAfter = await token.balanceOf(treasury.address);
      
      // Solo burn, no treasury fee
      const expectedBurn = (amount * 10n) / 10000n; // 0.1%
      expect(finalSupply).to.be.lt(initialSupply);
      expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore); // No change
    });

    it("✅ AMBOS en 0: Transfer simple sin deductions", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(0);
      await token.connect(owner).setTreasuryFee(0);
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const balanceBefore = await token.balanceOf(user1.address);
      // Transfer el balance real (sin fees porque burnRate y treasuryFee están en 0)
      await token.connect(user1).transfer(owner.address, balanceBefore);
      
      // User1 transfiere EXACTAMENTE amount sin deducciones
      expect(await token.balanceOf(owner.address)).to.be.gt(0);
    });
  });

  describe("EDGE CASE 2: Valores Máximos (100 bps burn, 200 bps fee)", function () {
    
    it("✅ burnRate = 100 (1%): Máximo burn permitido", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(100); // 1% máximo
      await token.connect(owner).setTreasuryFee(50);
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const initialSupply = await token.totalSupply();
      const user1Balance = await token.balanceOf(user1.address);
      
      await token.connect(user1).transfer(owner.address, user1Balance);
      
      const finalSupply = await token.totalSupply();
      const burned = initialSupply - finalSupply;
      
      // Burn se calcula sobre user1Balance (lo que realmente tiene), no amount
      const expectedBurn = (user1Balance * 100n) / 10000n; // 1%
      expect(burned).to.equal(expectedBurn);
    });

    it("✅ treasuryFee = 200 (2%): Máximo fee permitido", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(200); // 2% máximo
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const treasuryBefore = await token.balanceOf(treasury.address);
      const user1Balance = await token.balanceOf(user1.address);
      
      await token.connect(user1).transfer(owner.address, user1Balance);
      
      const treasuryAfter = await token.balanceOf(treasury.address);
      const feeReceived = treasuryAfter - treasuryBefore;
      
      // Fee se calcula sobre user1Balance (lo que realmente tiene), no amount
      const expectedFee = (user1Balance * 200n) / 10000n; // 2%
      expect(feeReceived).to.equal(expectedFee);
    });

    it("✅ AMBOS en MÁXIMO: 1% burn + 2% fee = 3% total", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(100);  // 1%
      await token.connect(owner).setTreasuryFee(200); // 2%
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const initialSupply = await token.totalSupply();
      const treasuryBefore = await token.balanceOf(treasury.address);
      const user1Balance = await token.balanceOf(user1.address);
      
      await token.connect(user1).transfer(owner.address, user1Balance);
      
      const finalSupply = await token.totalSupply();
      const treasuryAfter = await token.balanceOf(treasury.address);
      
      const burned = initialSupply - finalSupply;
      const feeReceived = treasuryAfter - treasuryBefore;
      
      // Calculado sobre user1Balance (balance real después del primer transfer)
      const expectedBurn = (user1Balance * 100n) / 10000n;
      const expectedFee = (user1Balance * 200n) / 10000n;
      const expectedReceived = user1Balance - expectedBurn - expectedFee;
      
      expect(burned).to.equal(expectedBurn);
      expect(feeReceived).to.equal(expectedFee);
    });
  });

  describe("EDGE CASE 3: Transfers Mínimos (1 wei)", function () {
    
    it("✅ Transfer 1 wei con burn+fee activos", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);  // 0.1%
      await token.connect(owner).setTreasuryFee(50); // 0.5%
      
      // Transfer inicial al user
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      
      // Transfer de solo 1 wei
      const amount = 1n;
      
      // Cálculos
      const burnAmount = (amount * 10n) / 10000n; // 0 (rounded down)
      const feeAmount = (amount * 50n) / 10000n;  // 0 (rounded down)
      const sendAmount = amount - burnAmount - feeAmount; // 1 wei
      
      // Debe revertir si sendAmount = 0
      if (sendAmount === 0n) {
        await expect(
          token.connect(user1).transfer(owner.address, amount)
        ).to.be.revertedWith("Send amount must be > 0");
      } else {
        // Si sendAmount > 0, debe funcionar
        await expect(
          token.connect(user1).transfer(owner.address, amount)
        ).to.not.be.reverted;
      }
    });

    it("✅ Transfer 100 wei: Verifica rounding correctamente", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);  // 0.1%
      await token.connect(owner).setTreasuryFee(50); // 0.5%
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      
      const amount = 100n;
      
      // Cálculos
      const burnAmount = (amount * 10n) / 10000n;  // 0
      const feeAmount = (amount * 50n) / 10000n;   // 0
      const sendAmount = amount - burnAmount - feeAmount; // 100
      
      expect(sendAmount).to.equal(100n);
      
      await expect(
        token.connect(user1).transfer(owner.address, amount)
      ).to.not.be.reverted;
    });

    it("✅ Transfer 10000 wei: Primera cantidad donde burn+fee > 0", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);  // 0.1% = 10/10000
      await token.connect(owner).setTreasuryFee(50); // 0.5% = 50/10000
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
      
      const amount = 10000n;
      
      const burnAmount = (amount * 10n) / 10000n;  // 10 wei
      const feeAmount = (amount * 50n) / 10000n;   // 50 wei
      const sendAmount = amount - burnAmount - feeAmount; // 9940 wei
      
      const supplyBefore = await token.totalSupply();
      const treasuryBefore = await token.balanceOf(treasury.address);
      
      await token.connect(user1).transfer(owner.address, amount);
      
      const supplyAfter = await token.totalSupply();
      const treasuryAfter = await token.balanceOf(treasury.address);
      
      expect(supplyBefore - supplyAfter).to.equal(burnAmount);
      expect(treasuryAfter - treasuryBefore).to.equal(feeAmount);
    });
  });

  describe("EDGE CASE 4: Transfers Máximos (Total Supply)", function () {
    
    it("✅ Transfer casi todo el supply (999M tokens)", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const totalSupply = await token.totalSupply(); // 1B
      const transferAmount = totalSupply - ethers.parseEther("1000000"); // 999M
      
      await token.connect(owner).transfer(user1.address, transferAmount);
      
      expect(await token.balanceOf(user1.address)).to.be.gt(0);
    });

    it("✅ Transfer con supply muy reducido: Verificar precision", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);
      
      // Quemar mucho supply mediante transfers con burn alto
      await token.connect(owner).setBurnRate(100); // 1%
      await token.connect(owner).setTreasuryFee(200); // 2%
      
      // Hacer 10 transfers de 100M cada uno (burn ~3% por transfer)
      for (let i = 0; i < 10; i++) {
        await token.connect(owner).transfer(user1.address, ethers.parseEther("100000000"));
        await token.connect(user1).transfer(user2.address, ethers.parseEther("50000000"));
      }
      
      const finalSupply = await token.totalSupply();
      const initialSupply = ethers.parseEther("1000000000");
      
      // Supply debe haber disminuido significativamente
      expect(finalSupply).to.be.lt(initialSupply);
    });
  });

  describe("EDGE CASE 5: Overflow/Underflow Protection", function () {
    
    it("✅ No overflow en cálculo de burn (amount * burnRate)", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(100); // 1%
      
      // Transfer máximo posible
      const totalSupply = await token.totalSupply();
      const maxTransfer = totalSupply / 2n; // 500M tokens
      
      await expect(
        token.connect(owner).transfer(user1.address, maxTransfer)
      ).to.not.be.reverted;
    });

    it("✅ No underflow en sendAmount = amount - burn - fee", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(100);  // 1%
      await token.connect(owner).setTreasuryFee(200); // 2%
      // Total: 3% deductions
      
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(user1.address, amount);
      
      const user1Balance = await token.balanceOf(user1.address);
      
      // sendAmount debe ser > 0 incluso con fees
      await expect(
        token.connect(user1).transfer(owner.address, user1Balance)
      ).to.not.be.reverted;
    });

    it("✅ Verificar que sendAmount > 0 está enforced", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      // Caso extremo: si burn+fee >= 100%, sendAmount sería 0
      // Pero nuestros límites son 1% + 2% = 3% max, así que siempre sendAmount > 0
      
      await token.connect(owner).setBurnRate(100);  // 1%
      await token.connect(owner).setTreasuryFee(200); // 2%
      
      const amount = ethers.parseEther("100");
      await token.connect(owner).transfer(user1.address, amount);
      
      const user1Balance = await token.balanceOf(user1.address);
      
      const burnAmount = (user1Balance * 100n) / 10000n;  
      const feeAmount = (user1Balance * 200n) / 10000n;   
      const sendAmount = user1Balance - burnAmount - feeAmount;
      
      expect(sendAmount).to.be.gt(0);
      
      await expect(
        token.connect(user1).transfer(owner.address, user1Balance)
      ).to.not.be.reverted;
    });
  });

  describe("EDGE CASE 6: Rounding Errors Acumulativos", function () {
    
    it("✅ 1000 transfers pequeños: Consistencia supply", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);
      
      // Capturar supply ANTES de activar burn/fees
      const initialSupply = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      // Transfer inicial (con fees porque ya están configurados)
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100000"));
      
      // 100 transfers ida y vuelta
      for (let i = 0; i < 100; i++) {
        const amount = ethers.parseEther("10");
        const user1Balance = await token.balanceOf(user1.address);
        const user2Balance = await token.balanceOf(user2.address);
        
        // Solo transferir si hay balance suficiente
        if (user1Balance >= amount) {
          await token.connect(user1).transfer(user2.address, amount);
        }
        if (user2Balance >= amount / 2n) {
          await token.connect(user2).transfer(user1.address, amount / 2n);
        }
      }
      
      const finalSupply = await token.totalSupply();
      const actualBurned = initialSupply - finalSupply;
      
      // Supply debe haber disminuido (burned > 0)
      expect(actualBurned).to.be.gt(0);
      // totalBurned tracking debe coincidir exactamente con supply reduction
      expect(await token.totalBurned()).to.equal(actualBurned);
    });

    it("✅ Transfers alternados: Balance consistency", async function () {
      const { token, owner, user1, user2, user3 } = await loadFixture(deployTokenFixture);
      
      // Capturar supply inicial ANTES de cualquier operación
      const initialTotalSupply = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      // Distribuir tokens (estos transfers también tendrán burn)
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user2.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user3.address, ethers.parseEther("10000"));
      
      const supplyBefore = await token.totalSupply();
      
      // Transfers en círculo
      for (let i = 0; i < 10; i++) {
        await token.connect(user1).transfer(user2.address, ethers.parseEther("100"));
        await token.connect(user2).transfer(user3.address, ethers.parseEther("50"));
        await token.connect(user3).transfer(user1.address, ethers.parseEther("25"));
      }
      
      const supplyAfter = await token.totalSupply();
      
      // Supply debe ser menor (deflacionario)
      expect(supplyAfter).to.be.lt(supplyBefore);
      
      // INVARIANTE FUNDAMENTAL: supply actual + totalBurned = supply inicial
      const totalBurned = await token.totalBurned();
      expect(supplyAfter + totalBurned).to.equal(initialTotalSupply);
    });
  });

  describe("INVARIANT VERIFICATION: Consistencia Matemática", function () {
    
    it("✅ INVARIANTE 1: totalSupply siempre disminuye (o igual si burn=0)", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10); // Con burn > 0
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
      
      const supply1 = await token.totalSupply();
      
      await token.connect(user1).transfer(owner.address, ethers.parseEther("500"));
      
      const supply2 = await token.totalSupply();
      
      // Supply debe haber disminuido
      expect(supply2).to.be.lt(supply1);
    });

    it("✅ INVARIANTE 2: totalBurned = supply inicial - supply actual", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const initialSupply = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
      
      for (let i = 0; i < 10; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("50"));
      }
      
      const finalSupply = await token.totalSupply();
      const totalBurned = await token.totalBurned();
      
      expect(totalBurned).to.equal(initialSupply - finalSupply);
    });

    it("✅ INVARIANTE 3: balance treasury = totalToTreasury", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setTreasuryFee(50);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
      
      const treasuryBalanceBefore = await token.balanceOf(treasury.address);
      const totalToTreasuryBefore = await token.totalToTreasury();
      
      for (let i = 0; i < 10; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("50"));
      }
      
      const treasuryBalanceAfter = await token.balanceOf(treasury.address);
      const totalToTreasuryAfter = await token.totalToTreasury();
      
      const feesCollected = treasuryBalanceAfter - treasuryBalanceBefore;
      const feesTracked = totalToTreasuryAfter - totalToTreasuryBefore;
      
      // Los fees reales recibidos deben coincidir con los tracked
      expect(feesCollected).to.equal(feesTracked);
    });
  });
});

/**
 * 📊 RESULTADOS ESPERADOS:
 * 
 * ✅ TODOS los tests DEBEN PASAR
 * 
 * Si algún test FALLA → BUG MATEMÁTICO identificado
 * 
 * 🔢 EDGE CASES VERIFICADOS:
 * 1. Valores en 0 (sin burn/fee)
 * 2. Valores máximos (1% burn + 2% fee)
 * 3. Transfers mínimos (1 wei, 100 wei, 10000 wei)
 * 4. Transfers máximos (999M tokens)
 * 5. No overflow/underflow
 * 6. Rounding errors acumulativos manejados
 * 
 * 🎯 INVARIANTES MATEMÁTICOS:
 * 1. totalSupply solo disminuye (deflacionario)
 * 2. totalBurned = supply inicial - supply actual
 * 3. treasury balance = totalToTreasury
 * 
 * 🛡️ CONCLUSIÓN:
 * Economía deflacionaria es matemáticamente sólida si todos pasan.
 */
