import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config();

export async function checkTokenRisk(provider, token) {
  const code = await provider.getCode(token);
  const risks = [];

  if (!code || code === '0x') {
    risks.push('No runtime bytecode (not a contract)');
    return { risks, score: 100 };
  }

  const runtimeCode = code.startsWith('0x') ? code.slice(2) : code;

  const needle = '636caf9a18';
  if (runtimeCode.toLowerCase().includes(needle)) {
    risks.push('Contains PUSH4 0x6caf9a18 (external transfer handler)');
  }

  const push20 = /73[0-9a-f]{40}/gi;
  const hardcodedAddrs = runtimeCode.match(push20) || [];
  if (hardcodedAddrs.length > 2) {
    risks.push(`Multiple hard-coded addresses (${hardcodedAddrs.length})`);
  }

  const calls = (runtimeCode.match(/f1/gi) || []).length;
  if (calls >= 2) {
    risks.push(`Multiple low-level CALLs in runtime bytecode (${calls})`);
  }

  const score = Math.min(100, risks.length * 30);
  return { risks, score, codeLen: runtimeCode.length / 2 };
}

// CLI entry
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1].endsWith('/checkTokenRisk.js') || process.argv[1].endsWith('\\checkTokenRisk.js')) {
  (async () => {
    try {
      const argv = process.argv.slice(2);
      const token = argv[0];
      if (!token) {
        console.error('Usage: node scripts/checkTokenRisk.js <tokenAddress>');
        process.exit(1);
      }
      const rpc = process.env.MAINNET_RPC_URL || 'https://rpc.ankr.com/eth';
      const provider = new ethers.JsonRpcProvider(rpc);
      const out = await checkTokenRisk(provider, token);
      console.log(JSON.stringify(out, null, 2));
    } catch (err) {
      console.error('Error executing checkTokenRisk:', err?.message || err);
      process.exit(1);
    }
  })();
}
