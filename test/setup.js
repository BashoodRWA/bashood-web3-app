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

  // Wrap getContractFactory to normalize MockPrice mock deployments and attach
  // legacy shim methods so tests using older APIs (setPrice/setUpdatedAt or
  // swapped constructor args) keep working without modifying production code.
  const originalGetContractFactory = hre.ethers.getContractFactory.bind(hre.ethers);
  hre.ethers.getContractFactory = async function (name, ...rest) {
    const factory = await originalGetContractFactory(name, ...rest);
    // Match common mock names used in tests
    const isPriceMock = typeof name === 'string' && (name.includes('MockPrice') || name.includes('MockFeed') || name === 'MockPrice');
    if (!isPriceMock) return factory;

    // Wrap deploy to detect swapped args: tests sometimes call deploy(scaledPrice, decimals)
    const originalDeploy = factory.deploy.bind(factory);
    factory.deploy = async function (...args) {
      // If first arg looks like a scaled price (bigint) and second arg is small (decimals), swap
      if (args.length >= 2) {
        const first = args[0];
        const second = args[1];
        const firstIsBigInt = typeof first === 'bigint' || (first && typeof first.toString === 'function' && first.toString().length > 3);
        const secondIsSmallNumber = (typeof second === 'number' && Number.isInteger(second) && second >= 0 && second <= 255) || (typeof second === 'bigint' && Number(second) >= 0 && Number(second) <= 255);
        if (firstIsBigInt && secondIsSmallNumber) {
          // swap to (decimals, scaledPrice)
          args = [second, first, ...args.slice(2)];
        }
      }

      const deployed = await originalDeploy(...args);

      // Attach JS shim methods if missing: setPrice -> setAnswer, setUpdatedAt -> setAnswerWithTimestamp or setUpdatedAt
      try {
        if (typeof deployed.setPrice !== 'function' && typeof deployed.setAnswer === 'function') {
          deployed.setPrice = async function (price, opts) {
            return deployed.setAnswer(price, opts);
          };
        }
        if (typeof deployed.setUpdatedAt !== 'function') {
          if (typeof deployed.setAnswerWithTimestamp === 'function') {
            deployed.setUpdatedAt = async function (ts, opts) {
              // preserve current answer if available
              let answer = 0;
              try {
                const _lr = await deployed.latestRoundData();
                answer = _lr[1];
              } catch (e) {
                // ignore
              }
              return deployed.setAnswerWithTimestamp(answer, ts, opts);
            };
          } else if (typeof deployed.setUpdatedAt === 'undefined') {
            // leave as-is if contract implements setUpdatedAt during compile-time
          }
        }
      } catch (e) {
        // best-effort patching; proceed even if augmentation fails
      }

      return deployed;
    };

    return factory;
  };
