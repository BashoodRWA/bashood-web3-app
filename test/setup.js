const chai = require('chai');
const hre = require('hardhat');

// Initialize singletons on globalThis to avoid redeclaration when solidity-coverage bundles tests
if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = chai.expect;
globalThis.expect = globalThis._chai_expect;

if (typeof globalThis.ethers === 'undefined') globalThis.ethers = hre.ethers;

// Centralize presale helpers
if (typeof globalThis._presaleHelpers === 'undefined') {
  // path is relative to test/ when mocha requires this file
  globalThis._presaleHelpers = require('./helpers/presaleHelpers');
}
globalThis.helpers = globalThis._presaleHelpers;
