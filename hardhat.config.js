require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

module.exports = {
  solidity: "0.8.28",
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts"
  },
  mocha: {
  timeout: 200000,
  spec: ["test/**/*.test.cjs"],
  // Configure reporter for CI JUnit output
  reporter: process.env.MOCHA_REPORTER || 'spec',
  reporterOptions: {
    mochaFile: process.env.MOCHA_FILE || 'reports/test-results.xml'
  }
  }
};

