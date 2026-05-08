const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
if (!fs.existsSync(file)) {
  console.error('coverage file not found:', file);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let totalStatements = 0;
let coveredStatements = 0;
const perFile = {};
for (const [fileKey, obj] of Object.entries(data)) {
  const s = obj.s || {};
  const keys = Object.keys(s);
  const fileTotal = keys.length;
  const fileCovered = keys.filter(k => (s[k] || 0) > 0).length;
  perFile[fileKey] = { total: fileTotal, covered: fileCovered };
  totalStatements += fileTotal;
  coveredStatements += fileCovered;
}
const pct = totalStatements === 0 ? 100 : (coveredStatements / totalStatements) * 100;
console.log('COVERAGE SUMMARY');
console.log('Total statements:', totalStatements);
console.log('Covered statements:', coveredStatements);
console.log('Overall coverage (%):', pct.toFixed(2));
console.log('\nPer-file (contracts of interest):');
['BashoodPresaleFinal.sol','BashoodRescue.sol','BashoodMultiToken.sol'].forEach(name => {
  const entryKey = Object.keys(perFile).find(k => k.includes(name));
  if (entryKey) {
    const e = perFile[entryKey];
    const p = e.total === 0 ? 100 : (e.covered / e.total) * 100;
    console.log(`${name}: ${e.covered}/${e.total} => ${p.toFixed(2)}%  (path: ${entryKey})`);
  } else {
    console.log(`${name}: not found in coverage JSON`);
  }
});

// Print short top-10 files with worst coverage (by percentage, ignoring files with 0 statements)
const filesWithStatements = Object.entries(perFile).filter(([k,v])=>v.total>0).map(([k,v])=>({file:k, pct: v.covered/v.total*100, ...v}));
filesWithStatements.sort((a,b)=>a.pct - b.pct);
console.log('\nTop 10 files with lowest coverage (of files with >0 statements):');
filesWithStatements.slice(0,10).forEach(f=>{
  console.log(`${f.file}: ${f.covered}/${f.total} => ${f.pct.toFixed(2)}%`);
});

process.exit(0);
