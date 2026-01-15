require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
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
    : {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000, // Maximum runs for smallest contract size
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true,
                optimizerSteps: "dhfoDgvulfnTUtnIf"
              }
            }
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
    }
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

