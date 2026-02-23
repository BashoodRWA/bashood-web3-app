@echo off
echo ================================================
echo VERIFICANDO SALDO EN BASE SEPOLIA
echo ================================================
echo.
echo Wallet: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
echo Red: Base Sepolia (Testnet)
echo.

node -e "const ethers = require('ethers'); const provider = new ethers.JsonRpcProvider('https://sepolia.base.org'); provider.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266').then(b => { const balance = ethers.formatEther(b); console.log('Balance actual:', balance, 'ETH'); if (parseFloat(balance) >= 0.1) { console.log(''); console.log('✅ LISTO PARA DESPLEGAR'); console.log('   Tienes suficiente ETH para deployment'); } else { console.log(''); console.log('⏳ NECESITAS MAS ETH'); console.log('   Minimo: 0.1 ETH (tienes:', balance, 'ETH)'); console.log('   Usa un faucet para obtener mas'); } });"

echo.
echo ================================================
pause
