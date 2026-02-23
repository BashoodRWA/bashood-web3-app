const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BashoodToken - Pause Timelock Security", function () {
    let bht;
    let owner, user1, treasury;

    beforeEach(async function () {
        [owner, user1, treasury] = await ethers.getSigners();

        const BashoodToken = await ethers.getContractFactory("BashoodToken");
        bht = await BashoodToken.deploy(treasury.address);
        await bht.waitForDeployment();

        // Dar tokens a user1 para testing
        await bht.transfer(user1.address, ethers.parseEther("1000"));
    });

    describe("Pause Timelock Mechanism", function () {
        it("✅ Debe permitir requestPause y emitir evento con executeTime", async function () {
            const tx = await bht.requestPause();
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            
            const expectedExecuteTime = block.timestamp + 24 * 60 * 60;
            
            await expect(tx)
                .to.emit(bht, "PauseRequested")
                .withArgs(expectedExecuteTime);
            
            expect(await bht.pauseRequestTime()).to.equal(block.timestamp);
        });

        it("❌ No debe permitir executePause antes de 24h", async function () {
            await bht.requestPause();
            
            // Intentar ejecutar inmediatamente
            await expect(bht.executePause())
                .to.be.revertedWith("Timelock active");
            
            // Avanzar solo 12h
            await time.increase(12 * 60 * 60);
            
            await expect(bht.executePause())
                .to.be.revertedWith("Timelock active");
        });

        it("✅ Debe permitir executePause después de 24h", async function () {
            await bht.requestPause();
            
            // Avanzar 24h + 1 segundo
            await time.increase(24 * 60 * 60 + 1);
            
            await expect(bht.executePause())
                .to.emit(bht, "Paused");
            
            expect(await bht.paused()).to.be.true;
            expect(await bht.pauseRequestTime()).to.equal(0); // Reset
        });

        it("✅ Debe permitir cancelar pauseRequest", async function () {
            await bht.requestPause();
            
            await expect(bht.cancelPauseRequest())
                .to.emit(bht, "PauseRequestCancelled");
            
            expect(await bht.pauseRequestTime()).to.equal(0);
            
            // Después de cancelar, no se puede ejecutar
            await time.increase(25 * 60 * 60);
            await expect(bht.executePause())
                .to.be.revertedWith("No pause requested");
        });

        it("❌ No debe permitir requestPause si ya está paused", async function () {
            await bht.requestPause();
            await time.increase(24 * 60 * 60 + 1);
            await bht.executePause();
            
            await expect(bht.requestPause())
                .to.be.revertedWithCustomError(bht, "EnforcedPause");
        });
    });

    describe("Unpause Timelock Mechanism", function () {
        beforeEach(async function () {
            // Pausar primero
            await bht.requestPause();
            await time.increase(24 * 60 * 60 + 1);
            await bht.executePause();
        });

        it("✅ Debe permitir requestUnpause y emitir evento", async function () {
            const tx = await bht.requestUnpause();
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            
            const expectedExecuteTime = block.timestamp + 24 * 60 * 60;
            
            await expect(tx)
                .to.emit(bht, "UnpauseRequested")
                .withArgs(expectedExecuteTime);
            
            expect(await bht.unpauseRequestTime()).to.equal(block.timestamp);
        });

        it("❌ No debe permitir executeUnpause antes de 24h", async function () {
            await bht.requestUnpause();
            
            await expect(bht.executeUnpause())
                .to.be.revertedWith("Timelock active");
            
            await time.increase(12 * 60 * 60);
            
            await expect(bht.executeUnpause())
                .to.be.revertedWith("Timelock active");
        });

        it("✅ Debe permitir executeUnpause después de 24h", async function () {
            await bht.requestUnpause();
            
            await time.increase(24 * 60 * 60 + 1);
            
            await expect(bht.executeUnpause())
                .to.emit(bht, "Unpaused");
            
            expect(await bht.paused()).to.be.false;
            expect(await bht.unpauseRequestTime()).to.equal(0);
        });

        it("✅ Debe permitir cancelar unpauseRequest", async function () {
            await bht.requestUnpause();
            
            await expect(bht.cancelUnpauseRequest())
                .to.emit(bht, "UnpauseRequestCancelled");
            
            expect(await bht.unpauseRequestTime()).to.equal(0);
        });
    });

    describe("Security - User Protection During Timelock", function () {
        it("✅ Usuarios pueden transferir durante los 24h después de requestPause", async function () {
            await bht.requestPause();
            
            // User1 tiene 24h para mover sus tokens
            await expect(bht.connect(user1).transfer(treasury.address, ethers.parseEther("100")))
                .to.not.be.reverted;
            
            // Avanzar 23h - aún puede transferir
            await time.increase(23 * 60 * 60);
            
            await expect(bht.connect(user1).transfer(treasury.address, ethers.parseEther("100")))
                .to.not.be.reverted;
            
            // Avanzar 1h más (total 24h) y ejecutar pause
            await time.increase(1 * 60 * 60 + 1);
            await bht.executePause();
            
            // Ahora SÍ está bloqueado
            await expect(bht.connect(user1).transfer(treasury.address, ethers.parseEther("100")))
                .to.be.revertedWithCustomError(bht, "EnforcedPause");
        });

        it("✅ Owner puede cancelar si comunidad rechaza la pausa", async function () {
            await bht.requestPause();
            
            // Simular que la comunidad protestó
            // Owner cancela después de 12h
            await time.increase(12 * 60 * 60);
            
            await bht.cancelPauseRequest();
            
            // Sistema vuelve a la normalidad
            await expect(bht.connect(user1).transfer(treasury.address, ethers.parseEther("100")))
                .to.not.be.reverted;
        });
    });

    describe("Edge Cases & Access Control", function () {
        it("❌ No-owner no puede requestPause", async function () {
            await expect(bht.connect(user1).requestPause())
                .to.be.revertedWithCustomError(bht, "OwnableUnauthorizedAccount");
        });

        it("❌ No puede executePause sin requestPause previo", async function () {
            await expect(bht.executePause())
                .to.be.revertedWith("No pause requested");
        });

        it("❌ No puede cancelar si no hay request pendiente", async function () {
            await expect(bht.cancelPauseRequest())
                .to.be.revertedWith("No pause requested");
        });

        it("✅ Múltiples requests resetean el timer", async function () {
            // Primer request
            await bht.requestPause();
            const firstRequestTime = await bht.pauseRequestTime();
            
            // Avanzar 12h
            await time.increase(12 * 60 * 60);
            
            // Segundo request (resetea el timer)
            await bht.requestPause();
            const secondRequestTime = await bht.pauseRequestTime();
            
            expect(secondRequestTime).to.be.greaterThan(firstRequestTime);
            
            // Ahora necesita esperar 24h desde el SEGUNDO request
            await time.increase(12 * 60 * 60);
            await expect(bht.executePause())
                .to.be.revertedWith("Timelock active");
            
            await time.increase(12 * 60 * 60 + 1);
            await expect(bht.executePause())
                .to.not.be.reverted;
        });
    });

    describe("Gas Optimization Check", function () {
        it("📊 Medición de gas para operaciones de timelock", async function () {
            const tx1 = await bht.requestPause();
            const receipt1 = await tx1.wait();
            console.log(`     ⛽ requestPause gas: ${receipt1.gasUsed.toString()}`);
            
            await time.increase(24 * 60 * 60 + 1);
            
            const tx2 = await bht.executePause();
            const receipt2 = await tx2.wait();
            console.log(`     ⛽ executePause gas: ${receipt2.gasUsed.toString()}`);
            
            const tx3 = await bht.requestUnpause();
            const receipt3 = await tx3.wait();
            console.log(`     ⛽ requestUnpause gas: ${receipt3.gasUsed.toString()}`);
            
            await time.increase(24 * 60 * 60 + 1);
            
            const tx4 = await bht.executeUnpause();
            const receipt4 = await tx4.wait();
            console.log(`     ⛽ executeUnpause gas: ${receipt4.gasUsed.toString()}`);
            
            // Verificar que las operaciones son razonables (<100k gas)
            expect(receipt1.gasUsed).to.be.lessThan(100000);
            expect(receipt2.gasUsed).to.be.lessThan(100000);
            expect(receipt3.gasUsed).to.be.lessThan(100000);
            expect(receipt4.gasUsed).to.be.lessThan(100000);
        });
    });
});
