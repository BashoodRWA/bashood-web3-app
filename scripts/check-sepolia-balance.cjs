require('dotenv').config();
const { ethers } = require('ethers');

async function checkSepoliaBalance() {
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log('Cuenta:', wallet.address);
    console.log('Verificando balance en Sepolia...\n');
    
    const balance = await provider.getBalance(wallet.address);
    const ethBalance = ethers.formatEther(balance);
    
    console.log('Balance Sepolia:', ethBalance, 'ETH');
    
    if (parseFloat(ethBalance) >= 0.02) {
      console.log('✅ Suficiente para hacer bridge a Base Sepolia');
      console.log('\nPróximo paso: Bridge 0.02 ETH a Base Sepolia');
      console.log('URL: https://bridge.base.org/deposit');
    } else if (parseFloat(ethBalance) > 0) {
      console.log('⚠️  Tienes ETH pero menos de 0.02 ETH recomendado');
      console.log('Déficit:', (0.02 - parseFloat(ethBalance)).toFixed(4), 'ETH');
    } else {
      console.log('❌ Sin balance en Sepolia');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSepoliaBalance();
