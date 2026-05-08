/**
 * simulate_transfer.js
 * Simulate transfer via eth_call: read balance before, call transfer via eth_call, read balance after.
 * Usage: node scripts/simulate_transfer.js <token> <user> <to> [amount]
 */
const { ethers } = require('ethers');
require('dotenv').config();

const rpc = process.env.MAINNET_RPC_URL || 'https://rpc.ankr.com/eth';
const provider = new ethers.providers.JsonRpcProvider(rpc);

async function main(token, user, to, amount = '1') {
  const iface = new ethers.Interface([
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function balanceOf(address) view returns (uint256)'
  ]);

  const beforeHex = await provider.call({ to: token, data: iface.encodeFunctionData('balanceOf', [user]) });
  const before = ethers.BigNumber.from(beforeHex).toString();
  console.log('balance before:', before);

  try {
    const simulate = await provider.call({ to: token, from: user, data: iface.encodeFunctionData('transfer', [to, ethers.BigNumber.from(amount)]) });
    console.log('simulate transfer returned:', simulate);
  } catch (err) {
    console.log('simulate transfer failed:', err.message || err);
  }

  const afterHex = await provider.call({ to: token, data: iface.encodeFunctionData('balanceOf', [user]) });
  const after = ethers.BigNumber.from(afterHex).toString();
  console.log('balance after:', after);

  if (before === after) {
    console.log('No balance change observed by eth_call — red flag if transfer "succeeds"');
  } else {
    console.log('Balance changed after simulated call (note: eth_call should not change chain state)');
  }
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node scripts/simulate_transfer.js <token> <user> <to> [amount]');
  process.exit(1);
}
main(args[0], args[1], args[2], args[3]).catch(err => { console.error(err); process.exit(1); });
