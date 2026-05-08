import { ethers } from "ethers";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config();

export async function checkTokenRisk(provider: any, token: string) {
  const code = await provider.getCode(token);
  const risks: string[] = [];

  if (!code || code === "0x") {
    risks.push("No runtime bytecode (not a contract)");
    return { risks, score: 100 };
  }

  // Normalize and strip 0x prefix for reliable pattern matching
  const runtimeCode = code.startsWith('0x') ? code.slice(2) : code;

  // 1) Presence of PUSH4 0x6caf9a18 (selector used by shadow handlers)
  const needle = "636caf9a18"; // 0x63 = PUSH4, then 6caf9a18
  if (runtimeCode.toLowerCase().includes(needle)) {
    risks.push("Contains PUSH4 0x6caf9a18 (external transfer handler)");
  }

  // 2) Hard-coded external addresses (PUSH20)
  const push20 = /73[0-9a-f]{40}/gi; // 0x73 = PUSH20
  const hardcodedAddrs = (runtimeCode.match(push20) || []);
  if (hardcodedAddrs.length > 2) {
    risks.push(`Multiple hard-coded addresses (${hardcodedAddrs.length})`);
  }

  // 3) Low-level call opcodes abundance (CALL = 0xf1)
  const calls = (runtimeCode.match(/f1/gi) || []).length;
  if (calls >= 2) {
    risks.push(`Multiple low-level CALLs in runtime bytecode (${calls})`);
  }

  const score = Math.min(100, risks.length * 30);
  return { risks, score, codeLen: runtimeCode.length / 2 };
}

// CLI helper (ESM-friendly). Run with: node --loader ts-node/esm scripts/checkTokenRisk.ts <token>
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1].endsWith('/checkTokenRisk.ts') || process.argv[1].endsWith('\\checkTokenRisk.ts')) {
  (async () => {
    const argv = process.argv.slice(2);
    const token = argv[0];
    if (!token) {
      console.error('Usage: node scripts/checkTokenRisk.ts <tokenAddress>');
      process.exit(1);
    }
    const rpc = process.env.MAINNET_RPC_URL || 'https://rpc.ankr.com/eth';
    const provider = new (ethers as any).JsonRpcProvider(rpc);
    const out = await checkTokenRisk(provider, token);
    console.log(JSON.stringify(out, null, 2));
  })();
}
