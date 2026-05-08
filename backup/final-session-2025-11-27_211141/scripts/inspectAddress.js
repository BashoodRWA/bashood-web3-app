const Ethers = require('ethers');
require('dotenv').config();

const RPC = process.env.MAINNET_RPC_URL;
if (!RPC) {
  console.error('MAINNET_RPC_URL not set in .env');
  process.exit(1);
}

// Support ethers v5 (ethers.providers.JsonRpcProvider) and v6 (ethers.JsonRpcProvider)
const JsonRpcProvider = (Ethers.providers && Ethers.providers.JsonRpcProvider) || Ethers.JsonRpcProvider || (Ethers && Ethers.getDefaultProvider && Ethers.getDefaultProvider);
if (!JsonRpcProvider) {
  console.error('Cannot find JsonRpcProvider in installed ethers; please install ethers@5 or ethers@6');
  process.exit(1);
}

const provider = new JsonRpcProvider(RPC);

// Address computed earlier from the decimal literal
const target = '0xf9f107b447ffb168a653461229addb4b83befcea';
const selector = '0x6caf9a18';

async function main() {
  console.log('Using RPC:', RPC);
  console.log('Inspecting address:', target);

  const code = await provider.getCode(target);
  console.log('getCode ->', code && code !== '0x' ? code.slice(0, 500) + (code.length>500?"...":"") : '(no code)');

  const storage0 = await provider.getStorageAt(target, 0);
  console.log('getStorageAt(slot 0) ->', storage0);

  // eth_call with the selector (no params)
  try {
    const res = await provider.call({ to: target, data: selector });
    console.log('eth_call(selector) ->', res);
  } catch (err) {
    console.log('eth_call failed ->', err.message);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
