// Frontend monitor-only module for token risk checks
// Usage (example):
// import { ethers } from 'ethers';
// import { monitorToken } from './checkTokenMonitor';
// const provider = new ethers.providers.Web3Provider(window.ethereum);
// const result = await monitorToken(provider, tokenAddress);

export async function monitorToken(provider, token) {
  const code = await provider.getCode(token);
  const risks = [];
  if (!code || code === '0x') {
    risks.push('No runtime bytecode (not a contract)');
    return { risks, score: 100 };
  }

  const lower = code.toLowerCase();
  const needle = '636caf9a18'; // PUSH4 0x6caf9a18
  if (lower.includes(needle)) {
    risks.push('Contains PUSH4 0x6caf9a18 (external transfer handler)');
  }

  const push20 = (lower.match(/73[0-9a-f]{40}/g) || []);
  if (push20.length > 2) {
    risks.push(`Multiple hard-coded addresses (${push20.length})`);
  }

  const calls = (lower.match(/f1/g) || []).length;
  if (calls >= 2) {
    risks.push(`Multiple low-level CALLs in runtime bytecode (${calls})`);
  }

  const score = Math.min(100, risks.length * 30);
  return { risks, score, codeLen: code.length / 2 };
}
