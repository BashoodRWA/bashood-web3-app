module.exports = {
  enabled: true,
  currency: "USD",
  gasPrice: 20,
  outputFile: "reports/gas-report.txt",
  coinmarketcap: process.env.CMC_API_KEY,
  excludeContracts: ["Mock", "Test", "Attacker"],
  showTimeSpent: true,
  showMethodSig: true,
  maxMethodDiff: 10,
  maxDeploymentDiff: 10,
  rst: true,
  rstTitle: "Gas Usage Report",
  onlyCalledMethods: false,
  noColors: false,
  forceTerminalOutput: false,
  forceTerminalOutputFormat: "terminal"
};