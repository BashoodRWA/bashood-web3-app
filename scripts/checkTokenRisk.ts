import { ethers } from "ethers";
import dotenv from 'dotenv';
dotenv.config();

export async function checkTokenRisk(provider: ethers.Provider, token: string) {
  const code = await provider.getCode(token);
  const risks: string[] = [];

  if (!code || code === "0x") {
    risks.push("No runtime bytecode (not a contract)");
    return { risks, score: 100 };
  }

  // 1) Presence of PUSH4 0x6caf9a18 (selector used by shadow handlers)
  const needle = "636caf9a18"; // 0x63 = PUSH4, then 6caf9a18
  if (code.toLowerCase().includes(needle)) {
    risks.push("Contains PUSH4 0x6caf9a18 (external transfer handler)");
  }

  // 2) Hard-coded external addresses (PUSH20)
  const push20 = /73[0-9a-f]{40}/gi; // 0x73 = PUSH20
  const hardcodedAddrs = (code.match(push20) || []);
  if (hardcodedAddrs.length > 2) {
    risks.push(`Multiple hard-coded addresses (${hardcodedAddrs.length})`);
  }

  // 3) Low-level call opcodes abundance (CALL = 0xf1)
  const calls = (code.match(/f1/gi) || []).length;
  if (calls >= 2) {
    risks.push(`Multiple low-level CALLs in runtime bytecode (${calls})`);
  }

  const score = Math.min(100, risks.length * 30);
  return { risks, score, codeLen: code.length / 2 };
}

// Quick CLI helper when run with `node --loader ts-node/esm scripts/checkTokenRisk.ts <token>`
if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const token = argv[0];
    if (!token) {
      console.error('Usage: node scripts/checkTokenRisk.ts <tokenAddress>');
      process.exit(1);
    }
    const rpc = process.env.MAINNET_RPC_URL || 'https://rpc.ankr.com/eth';
    const provider = new ethers.JsonRpcProvider ? new (ethers as any).JsonRpcProvider(rpc) : new (ethers as any).providers.JsonRpcProvider(rpc);
    const out = await checkTokenRisk(provider, token);
    console.log(JSON.stringify(out, null, 2));
  })();
}
