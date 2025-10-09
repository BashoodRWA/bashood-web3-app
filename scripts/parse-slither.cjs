const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '..', 'artifacts', 'slither', 'slither-run-latest.json');
const OUTPUT = path.resolve(__dirname, '..', 'artifacts', 'slither', 'rescue-findings.json');

function readCleanJson(filePath) {
  const raw = fs.readFileSync(filePath);
  // try utf8 string first
  let s = raw.toString('utf8');

  // find first JSON start char
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  let start = -1;
  if (firstBrace === -1) start = firstBracket; else if (firstBracket === -1) start = firstBrace; else start = Math.min(firstBrace, firstBracket);
  if (start > 0) s = s.slice(start);

  // if still failing, try to strip any non-printable prefix bytes
  // remove UTF-8 BOM if present
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);

  return s;
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('Input file not found:', INPUT);
    process.exit(2);
  }

  const cleaned = readCleanJson(INPUT);
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON.parse failed:', err && err.message);
    // write a copy for debugging
    const debugPath = INPUT + '.clean.txt';
    fs.writeFileSync(debugPath, cleaned, 'utf8');
    console.error('Wrote cleaned copy to', debugPath);
    process.exit(3);
  }

  // parsed structure may have results.detectors array or top-level findings
  const detectors = (parsed && parsed.results && parsed.results.detectors) || parsed.detectors || [];

  // collect findings that mention BashoodRescue in filename or description
  const findings = [];
  detectors.forEach(det => {
    const entries = det || [];
    // det might be an object with elements array or an array
    if (Array.isArray(entries)) {
      entries.forEach(e => {
        const json = e;
        const jstr = JSON.stringify(json);
        if (jstr.includes('BashoodRescue') || jstr.includes('BashoodRescue.sol')) findings.push(json);
      });
    } else if (entries && typeof entries === 'object') {
      const jstr = JSON.stringify(entries);
      if (jstr.includes('BashoodRescue')) findings.push(entries);
    }
  });

  // as a fallback, scan entire parsed object for BashoodRescue
  if (findings.length === 0) {
    const jstr = JSON.stringify(parsed);
    if (jstr.includes('BashoodRescue')) {
      // attempt to extract all objects that have filename_relative containing BashoodRescue
      const matches = [];
      function walk(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (obj.filename_relative && obj.filename_relative.includes('BashoodRescue')) matches.push(obj);
        for (const k of Object.keys(obj)) walk(obj[k]);
      }
      walk(parsed);
      matches.forEach(m => findings.push(m));
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify({extracted: findings, count: findings.length}, null, 2), 'utf8');
  console.log('Wrote', OUTPUT, 'with', findings.length, 'items');
}

main();
