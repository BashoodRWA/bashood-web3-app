const fs = require('fs');
const path = require('path');
const outDir = path.resolve(__dirname, '..', 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const outFile = path.join(outDir, 'slither_summary_report.md');
const slitherFile = path.resolve(__dirname, '..', 'slither-output.json');
if (!fs.existsSync(slitherFile)) {
  console.error('slither-output.json not found');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(slitherFile, 'utf8'));
const detectors = (data && data.results && Array.isArray(data.results.detectors)) ? data.results.detectors : [];
const targetFiles = ['BashoodPresaleFinal.sol','BashoodRescue.sol','BashoodMultiToken.sol'];

function extractElemInfo(elem) {
  if (!elem) return {filename:'unknown', lines: 'unknown'};
  if (elem.source_mapping) return { filename: elem.source_mapping.filename_relative, lines: elem.source_mapping.lines };
  if (elem.filename) return { filename: elem.filename, lines: elem.lines };
  return { filename: 'unknown', lines: 'unknown'};
}

const findingsByTarget = {};
for (const t of targetFiles) findingsByTarget[t]=[];
for (const d of detectors) {
  // consider only Medium or High impact
  const impact = (d.impact || '').toString().toLowerCase();
  if (!impact.includes('high') && !impact.includes('medium')) continue;
  // identify filename
  let elemInfo = {filename:'unknown', lines:'unknown'};
  if (Array.isArray(d.elements) && d.elements.length>0) elemInfo = extractElemInfo(d.elements[0]);
  const desc = d.description || d.markdown || d.first_markdown_element || '';
  for (const t of targetFiles) {
    if ((elemInfo.filename && elemInfo.filename.includes(t)) || JSON.stringify(d).toLowerCase().includes(t.toLowerCase())) {
      findingsByTarget[t].push({ check: d.check || 'unknown', impact: d.impact || 'unknown', confidence: d.confidence || 'unknown', filename: elemInfo.filename, lines: elemInfo.lines, description: desc, raw: d });
    }
  }
}

// Prioritize: High first, then Medium; within same impact, confidence High>Medium>Low
function prioritySort(a,b){
  const order = { 'high':3, 'medium':2, 'low':1 };
  const ai = (a.impact||'').toLowerCase();
  const bi = (b.impact||'').toLowerCase();
  if (order[ai] !== order[bi]) return order[bi]-order[ai];
  const confOrder = { 'high':3,'medium':2,'low':1,'unknown':0 };
  const ac = (a.confidence||'').toLowerCase();
  const bc = (b.confidence||'').toLowerCase();
  return (confOrder[bc]||0)-(confOrder[ac]||0);
}

let md = `# Slither Summary Report\n\n`;
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `This report extracts High and Medium impact findings from slither-output.json for the three production contracts of interest. It includes a short explanation and a proposed mitigation snippet for each finding (no production changes applied).\n\n`;

for (const t of targetFiles) {
  md += `## ${t}\n\n`;
  const findings = findingsByTarget[t].sort(prioritySort);
  if (findings.length === 0) {
    md += `No High/Medium findings found by Slither for ${t}.\n\n`;
    continue;
  }
  md += `Total findings (High/Medium): ${findings.length}\n\n`;
  let idx = 1;
  for (const f of findings) {
    md += `### ${idx}. ${f.check} — impact: ${f.impact} — confidence: ${f.confidence}\n`;
  md += "- File: `" + f.filename + "`\n";
  md += "- Lines: `" + JSON.stringify(f.lines) + "`\n";
    md += `- Description: ${f.description.toString().split('\n')[0]}\n`;
    md += `- Proposed mitigation (high-level):\n`;
    // Add tailored mitigation suggestions based on check
    const chk = (f.check || '').toString().toLowerCase();
    if (chk.includes('arbitrary-send-eth') || chk.includes('low-level-calls')) {
      md += `  - Ensure strict access control. Prefer pull-over-push pattern or set/update state before external call. Consider ReentrancyGuard for safety.\n`;
      md += `  - Example (pull-pattern):\n`;
      md += '```solidity\n// in contract: mapping(address => uint256) public pending;\n// emergencyWithdrawETH -> instead of direct call: pending[to]+=amount;\n// external withdraw() -> use Checks-Effects-Interactions then call\n```\n';
    } else if (chk.includes('reentrancy-no-eth') || chk.includes('reentrancy-events')) {
      md += `  - Follow Checks-Effects-Interactions: perform state updates before external calls (e.g., increment counters before call to _mint or safeTransfer).\n`;
      md += `  - Example: increment counters or set flags before calling external receiver hooks. Consider adding OpenZeppelin ReentrancyGuard if ETH transfers exist.\n`;
  md += "```solidity\n// Example: update state first\n_nftCounter++;\n_mint(to, id, 1, '');\n```\n";
    } else if (chk.includes('divide-before-multiply')) {
      md += `  - Reorder arithmetic to do multiplication before division or use a mulDiv implementation to avoid precision loss.\n`;
      md += '```solidity\n// Instead of: amount = (a / b) * c;\n// Use: amount = (a * c) / b; // or Math.mulDiv(a, c, b) for safer arithmetic\n```\n';
    } else if (chk.includes('unused-return')) {
      md += `  - Capture full return from price feed latestRoundData() and validate updatedAt/answeredInRound/answer to avoid stale or invalid prices.\n`;
      md += '```solidity\n(uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();\nrequire(answer > 0, "invalid price");\nrequire(updatedAt > 0 && block.timestamp - updatedAt < maxPriceAge, "stale price");\nrequire(answeredInRound >= roundId, "incomplete round");\n```\n';
    } else {
      md += `  - Suggest manual review and standard mitigations (access controls, CEI pattern, input validation).\n`;
    }
    md += `\n`;
    idx++;
  }
}

fs.writeFileSync(outFile, md);
console.log('Report written to', outFile);
process.exit(0);
