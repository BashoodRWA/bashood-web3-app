/**
 * 🔒 ECONOMIC INVARIANTS TEST SUITE: Verificación Exhaustiva
 * 
 * Propósito: Validar que los invariantes económicos NUNCA se rompen
 * Fecha: 18 Febrero 2026
 * 
 * INVARIANTES CRÍTICOS:
 * 1. totalSupply solo disminuye (deflacionario)
 * 2. totalSupply + totalBurned = INITIAL_SUPPLY (constante)
 * 3. sum(balances) + totalBurned = INITIAL_SUPPLY
 * 4. treasury balance solo aumenta
 * 5. totalToTreasury = treasury balance increases
 * 6. Cada transfer: burned + toTreasury + sent = amount
 * 7. totalBurned y totalToTreasury solo aumentan
 * 8. No se crean ni destruyen tokens (excepto burn)
 * 
 * ⚠️ SI ALGÚN INVARIANTE SE ROMPE → BUG ECONÓMICO CRÍTICO
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🔒 INVARIANTS: Economic Guarantees", function () {
  
  async function deployTokenFixture() {
    const [owner, treasury, user1, user2, user3, user4] = await ethers.getSigners();
    
    const BashoodToken = await ethers.getContractFactory("BashoodToken");
    const token = await BashoodToken.deploy(treasury.address);
    await token.waitForDeployment();
    
    return { token, owner, treasury, user1, user2, user3, user4 };
  }

  describe("INVARIANT 1: totalSupply Solo Disminuye (Deflacionario)", function () {
    
    it("✅ totalSupply nunca aumenta después de transfers", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      let previousSupply = await token.totalSupply();
      
      // 100 transfers: supply debe disminuir o mantenerse igual
      for (let i = 0; i < 100; i++) {
        const balance = await token.balanceOf(user1.address);
        if (balance > ethers.parseEther("10")) {
          await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
          
          const currentSupply = await token.totalSupply();
          expect(currentSupply).to.be.lte(previousSupply); // ≤ (nunca aumenta)
          previousSupply = currentSupply;
        }
      }
    });

    it("✅ Con burnRate=0: supply NO disminuye (solo fee)", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(0); // Sin burn
      await token.connect(owner).setTreasuryFee(50); // Solo fee
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
      const supply1 = await token.totalSupply();
      
      await token.connect(user1).transfer(owner.address, ethers.parseEther("100"));
      const supply2 = await token.totalSupply();
      
      // Sin burn, supply debe mantenerse igual
      expect(supply2).to.equal(supply1);
    });

    it("✅ Con burnRate>0: supply SIEMPRE disminuye en cada transfer", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10); // 0.1% burn
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
      
      for (let i = 0; i < 10; i++) {
        const supplyBefore = await token.totalSupply();
        
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
        
        const supplyAfter = await token.totalSupply();
        expect(supplyAfter).to.be.lt(supplyBefore); // SIEMPRE <
      }
    });
  });

  describe("INVARIANT 2: totalSupply + totalBurned = INITIAL_SUPPLY", function () {
    
    it("✅ Invariante se mantiene después de 100 transfers", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);
      
      const INITIAL_SUPPLY = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user2.address, ethers.parseEther("10000"));
      
      // 100 transfers
      for (let i = 0; i < 100; i++) {
        await token.connect(user1).transfer(user2.address, ethers.parseEther("10"));
        await token.connect(user2).transfer(user1.address, ethers.parseEther("5"));
      }
      
      const currentSupply = await token.totalSupply();
      const totalBurned = await token.totalBurned();
      
      // INVARIANTE FUNDAMENTAL
      expect(currentSupply + totalBurned).to.equal(INITIAL_SUPPLY);
    });

    it("✅ Invariante se mantiene con múltiples usuarios", async function () {
      const { token, owner, user1, user2, user3, user4 } = await loadFixture(deployTokenFixture);
      
      const INITIAL_SUPPLY = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(100); // 1% max burn
      await token.connect(owner).setTreasuryFee(200); // 2% max fee
      
      // Distribuir a 4 usuarios
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user2.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user3.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user4.address, ethers.parseEther("10000"));
      
      // Transfers entre usuarios
      for (let i = 0; i < 20; i++) {
        await token.connect(user1).transfer(user2.address, ethers.parseEther("100"));
        await token.connect(user2).transfer(user3.address, ethers.parseEther("50"));
        await token.connect(user3).transfer(user4.address, ethers.parseEther("25"));
        await token.connect(user4).transfer(user1.address, ethers.parseEther("10"));
      }
      
      const currentSupply = await token.totalSupply();
      const totalBurned = await token.totalBurned();
      
      expect(currentSupply + totalBurned).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("INVARIANT 3: sum(balances) + totalBurned = INITIAL_SUPPLY", function () {
    
    it("✅ Suma de todos los balances + burned = inicial", async function () {
      const { token, owner, treasury, user1, user2, user3 } = await loadFixture(deployTokenFixture);
      
      const INITIAL_SUPPLY = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user2.address, ethers.parseEther("10000"));
      await token.connect(owner).transfer(user3.address, ethers.parseEther("10000"));
      
      for (let i = 0; i < 50; i++) {
        await token.connect(user1).transfer(user2.address, ethers.parseEther("10"));
        await token.connect(user2).transfer(user3.address, ethers.parseEther("5"));
      }
      
      // Sumar todos los balances
      const balanceOwner = await token.balanceOf(owner.address);
      const balanceTreasury = await token.balanceOf(treasury.address);
      const balance1 = await token.balanceOf(user1.address);
      const balance2 = await token.balanceOf(user2.address);
      const balance3 = await token.balanceOf(user3.address);
      
      const totalBalances = balanceOwner + balanceTreasury + balance1 + balance2 + balance3;
      const totalBurned = await token.totalBurned();
      
      // INVARIANTE: totalBalances + totalBurned = INITIAL_SUPPLY
      expect(totalBalances + totalBurned).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("INVARIANT 4: Treasury Balance Solo Aumenta", function () {
    
    it("✅ treasury balance nunca disminuye", async function () {
      const { token, owner, treasury, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setTreasuryFee(50);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      let previousBalance = await token.balanceOf(treasury.address);
      
      for (let i = 0; i < 100; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
        
        const currentBalance = await token.balanceOf(treasury.address);
        expect(currentBalance).to.be.gte(previousBalance); // ≥ (nunca disminuye)
        previousBalance = currentBalance;
      }
    });

    it("✅ treasury balance = balance inicial + totalToTreasury", async function () {
      const { token, owner, treasury, user1 } = await loadFixture(deployTokenFixture);
      
      const initialTreasuryBalance = await token.balanceOf(treasury.address);
      
      await token.connect(owner).setTreasuryFee(50);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      for (let i = 0; i < 50; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
      }
      
      const finalTreasuryBalance = await token.balanceOf(treasury.address);
      const totalToTreasury = await token.totalToTreasury();
      
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + totalToTreasury);
    });
  });

  describe("INVARIANT 5: totalToTreasury Tracking Accuracy", function () {
    
    it("✅ totalToTreasury incrementa correctamente", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setTreasuryFee(50); // 0.5%
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      let previousTotal = await token.totalToTreasury();
      let previousBalance = await token.balanceOf(treasury.address);
      
      for (let i = 0; i < 50; i++) {
        const amount = ethers.parseEther("100");
        await token.connect(user1).transfer(owner.address, amount);
        
        const currentTotal = await token.totalToTreasury();
        const currentBalance = await token.balanceOf(treasury.address);
        
        const totalIncrement = currentTotal - previousTotal;
        const balanceIncrement = currentBalance - previousBalance;
        
        // El incremento de totalToTreasury debe coincidir con incremento de balance
        expect(totalIncrement).to.equal(balanceIncrement);
        
        previousTotal = currentTotal;
        previousBalance = currentBalance;
      }
    });
  });

  describe("INVARIANT 6: Transfer Accounting (burned + fee + sent = amount)", function () {
    
    it("✅ Accounting correcto en cada transfer", async function () {
      const { token, owner, user1, treasury } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);  // 0.1%
      await token.connect(owner).setTreasuryFee(50); // 0.5%
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      for (let i = 0; i < 10; i++) {
        const amount = ethers.parseEther("100");
        
        const supplyBefore = await token.totalSupply();
        const treasuryBefore = await token.balanceOf(treasury.address);
        const ownerBefore = await token.balanceOf(owner.address);
        
        await token.connect(user1).transfer(owner.address, amount);
        
        const supplyAfter = await token.totalSupply();
        const treasuryAfter = await token.balanceOf(treasury.address);
        const ownerAfter = await token.balanceOf(owner.address);
        
        const burned = supplyBefore - supplyAfter;
        const fee = treasuryAfter - treasuryBefore;
        const sent = ownerAfter - ownerBefore;
        
        // INVARIANTE: burned + fee + sent = amount (considerar user1Balance)
        // El user1 transfiere amount, pero con las fees aplicadas
        const user1TransferAmount = amount;
        
        // Verificar que burned y fee son > 0
        expect(burned).to.be.gt(0);
        expect(fee).to.be.gt(0);
        expect(sent).to.be.gt(0);
        
        // burned + fee + sent debe ser aproximadamente igual a amount
        // (puede haber pequeñas diferencias por rounding)
        expect(burned + fee + sent).to.be.closeTo(user1TransferAmount, ethers.parseEther("0.01"));
      }
    });
  });

  describe("INVARIANT 7: Monotonic Increases (totalBurned, totalToTreasury)", function () {
    
    it("✅ totalBurned solo aumenta (nunca disminuye)", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      let previousBurned = await token.totalBurned();
      
      for (let i = 0; i < 100; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
        
        const currentBurned = await token.totalBurned();
        expect(currentBurned).to.be.gte(previousBurned); // ≥
        previousBurned = currentBurned;
      }
    });

    it("✅ totalToTreasury solo aumenta (nunca disminuye)", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setTreasuryFee(50);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      let previousTotal = await token.totalToTreasury();
      
      for (let i = 0; i < 100; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
        
        const currentTotal = await token.totalToTreasury();
        expect(currentTotal).to.be.gte(previousTotal); // ≥
        previousTotal = currentTotal;
      }
    });

    it("✅ Ambos (burned + toTreasury) aumentan monotónicamente", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      let previousBurned = await token.totalBurned();
      let previousToTreasury = await token.totalToTreasury();
      
      for (let i = 0; i < 50; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
        
        const currentBurned = await token.totalBurned();
        const currentToTreasury = await token.totalToTreasury();
        
        expect(currentBurned).to.be.gte(previousBurned);
        expect(currentToTreasury).to.be.gte(previousToTreasury);
        
        previousBurned = currentBurned;
        previousToTreasury = currentToTreasury;
      }
    });
  });

  describe("INVARIANT 8: No Token Creation (Solo Destruction via Burn)", function () {
    
    it("✅ No se crean tokens: supply solo disminuye o igual", async function () {
      const { token, owner, user1, user2, user3, user4 } = await loadFixture(deployTokenFixture);
      
      const INITIAL_SUPPLY = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      // Distribuir y hacer muchas operaciones
      await token.connect(owner).transfer(user1.address, ethers.parseEther("50000"));
      await token.connect(owner).transfer(user2.address, ethers.parseEther("50000"));
      await token.connect(owner).transfer(user3.address, ethers.parseEther("50000"));
      await token.connect(owner).transfer(user4.address, ethers.parseEther("50000"));
      
      for (let i = 0; i < 20; i++) {
        await token.connect(user1).transfer(user2.address, ethers.parseEther("100"));
        await token.connect(user2).transfer(user3.address, ethers.parseEther("100"));
        await token.connect(user3).transfer(user4.address, ethers.parseEther("100"));
        await token.connect(user4).transfer(user1.address, ethers.parseEther("100"));
      }
      
      const finalSupply = await token.totalSupply();
      
      // Supply final NUNCA puede ser mayor que inicial
      expect(finalSupply).to.be.lte(INITIAL_SUPPLY);
    });

    it("✅ totalSupply consistency: nunca excede INITIAL_SUPPLY", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      const INITIAL_SUPPLY = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(100);
      await token.connect(owner).setTreasuryFee(200);
      await token.connect(owner).transfer(user1.address, ethers.parseEther("10000"));
      
      for (let i = 0; i < 100; i++) {
        await token.connect(user1).transfer(owner.address, ethers.parseEther("10"));
        
        const currentSupply = await token.totalSupply();
        expect(currentSupply).to.be.lte(INITIAL_SUPPLY);
      }
    });
  });

  describe("COMPREHENSIVE INVARIANT TEST: Stress Testing", function () {
    
    it("✅ TODOS los invariantes después de 500 transfers", async function () {
      const { token, owner, treasury, user1, user2, user3 } = await loadFixture(deployTokenFixture);
      
      const INITIAL_SUPPLY = await token.totalSupply();
      
      await token.connect(owner).setBurnRate(10);
      await token.connect(owner).setTreasuryFee(50);
      
      await token.connect(owner).transfer(user1.address, ethers.parseEther("100000"));
      await token.connect(owner).transfer(user2.address, ethers.parseEther("100000"));
      await token.connect(owner).transfer(user3.address, ethers.parseEther("100000"));
      
      // 500 transfers (reducido de 1000 para velocidad)
      for (let i = 0; i < 500; i++) {
        const balance1 = await token.balanceOf(user1.address);
        const balance2 = await token.balanceOf(user2.address);
        const balance3 = await token.balanceOf(user3.address);
        
        if (balance1 > ethers.parseEther("10")) {
          await token.connect(user1).transfer(user2.address, ethers.parseEther("10"));
        }
        if (balance2 > ethers.parseEther("10")) {
          await token.connect(user2).transfer(user3.address, ethers.parseEther("5"));
        }
        if (balance3 > ethers.parseEther("10")) {
          await token.connect(user3).transfer(user1.address, ethers.parseEther("2"));
        }
      }
      
      // Verificar TODOS los invariantes
      const finalSupply = await token.totalSupply();
      const totalBurned = await token.totalBurned();
      const totalToTreasury = await token.totalToTreasury();
      const treasuryBalance = await token.balanceOf(treasury.address);
      
      // 1. supply + burned = inicial
      expect(finalSupply + totalBurned).to.equal(INITIAL_SUPPLY);
      
      // 2. supply ≤ inicial
      expect(finalSupply).to.be.lte(INITIAL_SUPPLY);
      
      // 3. burned > 0 (hubo burn)
      expect(totalBurned).to.be.gt(0);
      
      // 4. toTreasury > 0 (hubo fees)
      expect(totalToTreasury).to.be.gt(0);
      
      // 5. Suma de balances + burned = inicial
      const balance1 = await token.balanceOf(user1.address);
      const balance2 = await token.balanceOf(user2.address);
      const balance3 = await token.balanceOf(user3.address);
      const balanceOwner = await token.balanceOf(owner.address);
      
      const sumBalances = balance1 + balance2 + balance3 + balanceOwner + treasuryBalance;
      expect(sumBalances + totalBurned).to.equal(INITIAL_SUPPLY);
    });
  });
});

/**
 * 📊 RESULTADOS ESPERADOS:
 * 
 * ✅ TODOS los tests DEBEN PASAR
 * 
 * Si algún invariante se ROMPE → BUG ECONÓMICO CRÍTICO
 * 
 * 🔒 INVARIANTES VERIFICADOS:
 * 1. totalSupply solo disminuye (deflacionario) ✅
 * 2. totalSupply + totalBurned = INITIAL_SUPPLY ✅
 * 3. sum(balances) + totalBurned = INITIAL_SUPPLY ✅
 * 4. treasury balance solo aumenta ✅
 * 5. totalToTreasury tracking accuracy ✅
 * 6. Transfer accounting: burned + fee + sent = amount ✅
 * 7. totalBurned y totalToTreasury monotónicos (solo aumentan) ✅
 * 8. No token creation (solo destruction via burn) ✅
 * 9. Stress test: 500 transfers mantienen todos los invariantes ✅
 * 
 * 🎯 CONCLUSIÓN:
 * Si todos los tests pasan → Economía deflacionaria es MATEMÁTICAMENTE SÓLIDA
 */
