const fs = require('fs');
const path = require('path');

const inPath = path.resolve(__dirname, '..', 'artifacts', 'slither', 'slither-run-latest.json');
const outPath = path.resolve(__dirname, '..', 'artifacts', 'slither', 'rescue-findings.json');

if (!fs.existsSync(inPath)) {
  console.error('INPUT_MISSING:', inPath);
  process.exit(2);
}

let data;
try {
  const raw = fs.readFileSync(inPath, 'utf8');
  data = JSON.parse(raw);
} catch (e) {
  console.error('PARSE_ERROR:', e && e.message ? e.message : e);
  process.exit(3);
}

const arr = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);

const needle1 = 'contracts/BashoodRescue.sol';
const needle2 = 'BashoodRescue';

const results = arr.filter(item => {
  try {
    const s = JSON.stringify(item);
    return s.indexOf(needle1) !== -1 || s.indexOf(needle2) !== -1;
  } catch (e) {
    return false;
  }
});

fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('WROTE', outPath, 'with', results.length, 'items');
