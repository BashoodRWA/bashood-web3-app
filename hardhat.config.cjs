require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10  // Reduced for large contracts
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 200000
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    // Base Sepolia Testnet
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};
