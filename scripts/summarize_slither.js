const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'slither-output.json');
if (!fs.existsSync(file)) {
  console.error('slither file not found:', file);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
// slither JSON usually has an array of 'results' or similar structure; inspect top keys
let findings = [];
if (Array.isArray(data)) findings = data;
else if (data['results'] && Array.isArray(data['results'])) findings = data['results'];
else if (data['detectors'] && Array.isArray(data['detectors'])) findings = data['detectors'];
else if (data['issues'] && Array.isArray(data['issues'])) findings = data['issues'];
else if (data['data'] && Array.isArray(data['data'])) findings = data['data'];
else {
  // attempt to find issues array by heuristics
  const possible = Object.values(data).flatMap(v => Array.isArray(v) ? v : []);
  findings = possible.filter(x => x && x['check'] && x['impact']);
}

const severities = { high:0, medium:0, low:0, info:0 };
const targetFiles = [ 'BashoodPresaleFinal.sol', 'BashoodRescue.sol', 'BashoodMultiToken.sol' ];
const perTarget = {};
for (const t of targetFiles) perTarget[t] = [];

for (const f of findings) {
  const impact = (f.impact || f.severity || '').toString().toLowerCase();
  if (impact.includes('high')) severities.high++;
  else if (impact.includes('medium')) severities.medium++;
  else if (impact.includes('low')) severities.low++;
  else severities.info++;

  // Try to extract filename from finding
  const filename = (f.filename || f['contract'] || (f['elements'] && f['elements'][0] && f['elements'][0]['filename']) || 'unknown');
  for (const t of targetFiles) {
    if (filename && filename.includes(t)) {
      perTarget[t].push(f);
    } else {
      // also check textual description
      const txt = JSON.stringify(f).toLowerCase();
      if (txt.includes(t.toLowerCase())) perTarget[t].push(f);
    }
  }
}

console.log('SLITHER SUMMARY');
console.log('Total findings (approx):', Object.values(severities).reduce((a,b)=>a+b,0));
console.log('Severities:', severities);
console.log('\nFindings for target contracts:');
for (const t of targetFiles) {
  console.log(`\n== ${t} (${perTarget[t].length} findings)`);
  perTarget[t].slice(0,20).forEach((it, idx)=>{
    const check = it.check || it.checker || it['title'] || it['description'] || it['type'] || 'unknown';
    const impact = it.impact || it.severity || 'unknown';
    const filename = it.filename || (it['elements'] && it['elements'][0] && it['elements'][0]['filename']) || 'unknown';
    const lines = (it['elements'] && it['elements'][0] && it['elements'][0]['lines']) || it['lines'] || 'unknown';
    console.log(`${idx+1}. ${check} | impact:${impact} | file:${filename} | lines:${JSON.stringify(lines)}`);
  });
  if (perTarget[t].length > 20) console.log(`... and ${perTarget[t].length - 20} more`);
}

process.exit(0);
