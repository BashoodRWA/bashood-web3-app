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
    timeout: 200000
  }
};
