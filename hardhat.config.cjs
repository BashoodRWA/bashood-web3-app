require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

// ── Audit pipeline tasks ──────────────────────────────────────────────────────
require("./tasks/audit-gas.cjs");
require("./tasks/audit-coverage.cjs");
require("./tasks/audit-slither.cjs");
require("./tasks/audit-regulatory.cjs");
require("./tasks/audit-custom.cjs");
require("./tasks/audit-known-risks.cjs");
require("./tasks/audit-report.cjs");
require("./tasks/audit-full.cjs");
require("./tasks/audit-full.cjs");
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10  // Reduced for large contracts
      },
      // Cancun required for OZ v5 Governor (uses mcopy opcode).
      // Base L2 is Cancun-compatible (activated June 2024).
      evmVersion: "cancun"
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
    // Fork de Base Mainnet para testing local con estado real
    "base-fork": {
      url: "http://127.0.0.1:8545",
      forking: {
        url: process.env.BASE_MAINNET_RPC || "https://mainnet.base.org",
        enabled: true
      },
      chainId: 8453,
      allowUnlimitedContractSize: true
    },
    // Base Sepolia Testnet
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei
    },
    // Base Mainnet (Production)
    "base-mainnet": {
      url: process.env.BASE_MAINNET_RPC || "https://mainnet.base.org",
      accounts: process.env.BASE_MAINNET_PRIVATE_KEY ? [process.env.BASE_MAINNET_PRIVATE_KEY] : [],
      chainId: 8453,
      gasPrice: 1000000000, // 1 gwei
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};
