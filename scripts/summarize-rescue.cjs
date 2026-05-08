const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '..', 'artifacts', 'slither', 'rescue-findings.json');

if (!fs.existsSync(INPUT)) {
  console.error('File not found:', INPUT);
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const arr = data.extracted || [];

arr.forEach((f, i) => {
  const id = f.id || '<no-id>';
  const check = f.check || '<no-check>';
  const impact = f.impact || '<no-impact>';
  const confidence = f.confidence || '<no-confidence>';
  // try to find a filename and lines
  let file = null;
  let lines = [];
  if (Array.isArray(f.elements)) {
    for (const e of f.elements) {
      if (e && e.source_mapping && e.source_mapping.filename_relative && e.source_mapping.filename_relative.includes('BashoodRescue')) {
        file = e.source_mapping.filename_relative;
        lines = e.source_mapping.lines || [];
        break;
      }
    }
  }
  if (!file) {
    // fallback: scan nested objects
    function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (o.filename_relative && o.filename_relative.includes('BashoodRescue')) { file = o.filename_relative; lines = o.lines || []; }
      for (const k of Object.keys(o)) walk(o[k]);
    }
    walk(f);
  }

  const desc = (f.description || '').split('\n')[0];
  console.log(`${i+1}. id=${id}`);
  console.log(`   check=${check}  impact=${impact}  confidence=${confidence}`);
  if (file) console.log(`   location=${file}:${lines.length?lines.join(','):'(lines unknown)'}`);
  if (desc) console.log(`   desc=${desc}`);
  console.log('');
});

if (arr.length === 0) console.log('No findings found for BashoodRescue.');
