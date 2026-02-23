module.exports = {
  skipFiles: [
    // Deprecated contracts (0% coverage, no tests)
    "deprecated/BashoodNFTIntegration.sol",

    // RWA reference implementation (5% coverage, separate fuzzing via Foundry)
    "standards/BashoodRWAReference.sol",

    // Echidna fuzzing harnesses (not covered by Hardhat tests)
    "test/EchidnaBashoodPresaleTest.sol",
    "test/EchidnaBashoodTokenTest.sol",

    // Root-level duplicate mocks (identical copies exist in mocks/)
    "MockBHT.sol",
    "MockERC20.sol",
    "MockPriceFeed.sol",
    "MockRescue.sol",
    "MockPresale.sol",
    "MockPresaleTarget.sol",
    "MockBashoodToken.sol",
    "MockTreasuryHandler.sol",
  ],
};
