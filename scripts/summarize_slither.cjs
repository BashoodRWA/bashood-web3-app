const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'slither-output.json');
if (!fs.existsSync(file)) {
  console.error('slither file not found:', file);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let findings = [];
// Slither JSON structure: data.results.detectors is the usual array of findings
if (data && data.results && Array.isArray(data.results.detectors)) {
  findings = data.results.detectors;
} else if (Array.isArray(data)) {
  findings = data;
} else if (data['detectors'] && Array.isArray(data['detectors'])) {
  findings = data['detectors'];
} else if (data['issues'] && Array.isArray(data['issues'])) {
  findings = data['issues'];
} else if (data['data'] && Array.isArray(data['data'])) {
  findings = data['data'];
} else {
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

  // try to extract filename and lines from elements[0].source_mapping.filename_relative
  let filename = 'unknown';
  let lines = 'unknown';
  if (f.elements && Array.isArray(f.elements) && f.elements.length > 0) {
    const el = f.elements[0];
    if (el.source_mapping && el.source_mapping.filename_relative) filename = el.source_mapping.filename_relative;
    if (el.source_mapping && el.source_mapping.lines) lines = el.source_mapping.lines;
  }
  if (filename === 'unknown') filename = (f.filename || f['contract'] || 'unknown');
  for (const t of targetFiles) {
    if (filename && filename.includes(t)) {
      perTarget[t].push({ finding: f, filename, lines });
    } else {
      const txt = JSON.stringify(f).toLowerCase();
      if (txt.includes(t.toLowerCase())) perTarget[t].push({ finding: f, filename, lines });
    }
  }
}

console.log('SLITHER SUMMARY');
console.log('Total findings (approx):', Object.values(severities).reduce((a,b)=>a+b,0));
console.log('Severities:', severities);
console.log('\nFindings for target contracts:');
for (const t of targetFiles) {
  console.log(`\n== ${t} (${perTarget[t].length} findings)`);
  perTarget[t].slice(0,50).forEach((it, idx)=>{
    const f = it.finding;
    const check = f.check || f.checker || f['title'] || f['description'] || f['type'] || 'unknown';
    const impact = f.impact || f.severity || 'unknown';
    const confidence = f.confidence || f['confidence'] || 'unknown';
    const description = f.description || f.markdown || f.first_markdown_element || '';
    console.log(`${idx+1}. ${check} | impact:${impact} | confidence:${confidence} | file:${it.filename} | lines:${JSON.stringify(it.lines)}`);
    if (description) console.log('    description:', description.toString().split('\n')[0]);
  });
  if (perTarget[t].length > 50) console.log(`... and ${perTarget[t].length - 50} more`);
}

process.exit(0);
