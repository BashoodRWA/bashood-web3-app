require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require('dotenv').config();
// enable solidity-coverage plugin (used to generate coverage/coverage-final.json)
try {
  require('solidity-coverage');
} catch (e) {
  // If the plugin isn't installed in some environments, tests will still run.
  // We don't want to fail startup just because coverage isn't available.
  // The `package-lock.json` includes solidity-coverage, so this should work locally/CI.
}

// Build reporter value: allow using the installed mocha-junit-reporter module
let configuredReporter = process.env.MOCHA_REPORTER || 'spec';
if (configuredReporter === 'mocha-junit-reporter') {
  try {
    // Provide the actual reporter function/module to Mocha so reporterOptions are honored.
    configuredReporter = require('mocha-junit-reporter');
  } catch (e) {
    // If the module isn't available, Fall back to the string name (Hardhat will try to resolve it)
    // and emit a console warning. This keeps environments without the devDependency working.
    console.warn('mocha-junit-reporter not installed; JUnit XML will not be generated locally.');
    configuredReporter = process.env.MOCHA_REPORTER || 'spec';
  }
}

module.exports = {
  // Use an object so we can toggle optimizer settings when running coverage.
  solidity: process.env.COVERAGE
    ? {
        compilers: [
          {
            version: "0.8.28",
            settings: {
              optimizer: {
                enabled: false,
                runs: 1
              }
            }
          }
        ]
      }
    : process.env.DEBUG_ORACLE
    ? {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: false  // Disable optimizer for debugging oracle validation issue
          }
        }
      }
    : {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10, // Low runs for large contracts (BashoodRWAReference = 28KB)
          },
          metadata: {
            bytecodeHash: "none"  // Remove metadata hash to reduce contract size
          }
        }
      },
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts"
  },
  mocha: {
  timeout: 600000,
  // Ensure setup runs before any test files. Use 'file' for ESM-aware preloads and keep 'require' for CJS.
  file: ['test/setup.cjs', 'test/setup.js'],
  require: ['test/setup.cjs', 'test/setup.js'],
  spec: ["test/**/*.test.cjs", "test/**/*.test.js"],
    // Configure reporter for CI JUnit output
    reporter: configuredReporter,
    reporterOptions: {
      mochaFile: process.env.MOCHA_FILE || 'reports/test-results.xml'
    }
  }
  ,
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    // Base Sepolia Testnet
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: process.env.BASE_SEPOLIA_PRIVATE_KEY 
        ? [process.env.BASE_SEPOLIA_PRIVATE_KEY]
        : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei (Base has low gas)
    },
    // Base Mainnet (Production)
    "base-mainnet": {
      url: process.env.BASE_MAINNET_RPC || "https://mainnet.base.org",
      accounts: process.env.BASE_MAINNET_PRIVATE_KEY 
        ? [process.env.BASE_MAINNET_PRIVATE_KEY]
        : [],
      chainId: 8453,
      gasPrice: 1000000000, // 1 gwei (Base has low gas)
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
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
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  }
};

