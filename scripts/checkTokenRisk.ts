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
  // We capture the 20-byte operand after the PUSH20 opcode (0x73), normalize and deduplicate
  const rc = runtimeCode.toLowerCase();
  const push20 = /73([0-9a-f]{40})/gi; // 0x73 = PUSH20, capture the 20 bytes following
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = push20.exec(rc)) !== null) found.push(m[1]);

  // helper to classify a 20-byte hex word: likely address vs embedded data
  function isLikelyEthAddress(hex20: string) {
    // reject all-zero or all-ff
    if (!hex20 || /^0{40}$/.test(hex20) || /^f{40}$/.test(hex20)) return false;
    // decode bytes and check printable ascii ratio; if many printable chars -> likely data
    const buf = Buffer.from(hex20, 'hex');
    let printable = 0;
    for (const b of buf) {
      if (b >= 32 && b <= 126) printable++;
    }
    const printableRatio = printable / 20;
    if (printableRatio > 0.5) return false; // treat as embedded ascii/data
    // otherwise treat as plausible address
    return true;
  }

  const uniques = Array.from(new Set(found.map(h => h.toLowerCase())));
  // partition into likely addresses and data-like words
  const likelyAddrs: string[] = [];
  const dataWords: string[] = [];
  for (const h of uniques) {
    if (isLikelyEthAddress(h)) likelyAddrs.push('0x' + h);
    else dataWords.push('0x' + h);
  }
  // ignore zero/token address in the likely list
  const tokenNormalized = token ? token.toLowerCase().replace(/^0x/, '') : '';
  const filteredLikely = likelyAddrs.filter(a => a !== '0x' + tokenNormalized && a !== '0x' + '0'.repeat(40));

  if (filteredLikely.length > 2) {
    risks.push(`Multiple hard-coded addresses (${filteredLikely.length}): ${filteredLikely.slice(0, 5).join(', ')}`);
  } else if (dataWords.length > 0 && filteredLikely.length > 0) {
    // mixed content: report both categories concisely
    risks.push(`Found ${filteredLikely.length} likely addresses and ${dataWords.length} data-like 20-byte words (examples: ${[...filteredLikely.slice(0,3), ...dataWords.slice(0,2)].join(', ')})`);
  } else if (dataWords.length > 3) {
    risks.push(`Multiple embedded 20-byte data words (${dataWords.length}) — may indicate embedded metadata`);
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
