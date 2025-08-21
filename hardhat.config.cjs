require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.7",
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 200000
  }
};
