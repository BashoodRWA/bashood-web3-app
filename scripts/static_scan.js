/**
 * static_scan.js
 * Quick node script to scan runtime bytecode for suspicious patterns described in the plan.
 * Usage: MAINNET_RPC_URL=... node scripts/static_scan.js <tokenAddress>
 */
const { ethers } = require('ethers');
require('dotenv').config();
const rpc = process.env.MAINNET_RPC_URL || 'https://rpc.ankr.com/eth';
const provider = new ethers.providers.JsonRpcProvider(rpc);

async function scan(address) {
  console.log('RPC:', rpc);
  console.log('Address:', address);
  const code = await provider.getCode(address);
  if (!code || code === '0x') {
    console.log('No runtime bytecode (not a contract)');
    return;
  }

  const lower = code.toLowerCase();
  const results = {};
  results.codeLen = code.length / 2;
  results.contains_selector_6caf9a18 = lower.includes('636caf9a18');

  const push20 = lower.match(/73[0-9a-f]{40}/g) || [];
  results.push20 = push20;
  results.push20_count = push20.length;

  const calls = (lower.match(/f1/g) || []).length;
  results.call_count = calls;

  console.log(JSON.stringify(results, null, 2));
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/static_scan.js <tokenAddress>');
  process.exit(1);
}
scan(args[0]).catch(err => { console.error(err); process.exit(1); });
