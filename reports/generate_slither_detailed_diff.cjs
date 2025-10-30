const fs = require('fs');
const path = require('path');
const newP = path.resolve('reports/slither-report-2025-10-30.json');
const oldP = path.resolve('slither-report-after-rescue-check-2025-10-28.json');
function safeRead(p){ try { return fs.readFileSync(p,'utf8'); } catch(e){ console.error('Missing',p); process.exit(1); } }
const newJ = JSON.parse(safeRead(newP));
const oldJ = JSON.parse(safeRead(oldP));
const newDet = newJ.results.detectors || {};
const oldDet = oldJ.results.detectors || {};
function normalize(detObj){
  // detObj: { detectorName: [findings] } or numeric keys -> map to name
  const out = {};
  // detectors in these JSONs are arrays keyed by index, each entry has name and findings
  if(Array.isArray(detObj)){
    detObj.forEach(d=>{
      const name = d.check ? d.check  : (d.detector ? d.detector : (d.name || '<unknown>'));
      const findings = d.findings || [];
      out[name] = findings.length;
    });
  } else if(typeof detObj === 'object'){
    // sometimes key->array of findings
    Object.keys(detObj).forEach(k=>{
      const v = detObj[k];
      if(Array.isArray(v)) out[k] = v.length;
      else out[k] = Object.keys(v).length;
    });
  }
  return out;
}
const newCount = normalize(newDet);
const oldCount = normalize(oldDet);
// union of keys
const allKeys = Array.from(new Set([...Object.keys(newCount), ...Object.keys(oldCount)])).sort();
const rows = allKeys.map(k=>{ const n = newCount[k]||0; const o = oldCount[k]||0; return {detector:k, old:o, new:n, delta:n-o}; });
// sort by absolute delta desc
rows.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta) || b.new - a.new || a.detector.localeCompare(b.detector));

// write CSV
const csvLines = ['detector,old,new,delta'];
rows.forEach(r=> csvLines.push(`"${r.detector.replace(/"/g,'""')}",${r.old},${r.new},${r.delta}`));
fs.writeFileSync('reports/slither-detailed-diff-2025-10-30.csv', csvLines.join('\n'));

// write pretty MD with top changes and full table
let md = `# Slither detailed diff 2025-10-30\n\n`;
md += `Compared files:\n- New: ${newP}\n- Baseline: ${oldP}\n\n`;
md += `Total detectors compared: ${allKeys.length}\n\n`;
md += `## Top 20 detector deltas (absolute)\n\n`;
md += `| Detector | Baseline | New | Delta |\n|---|---:|---:|---:|\n`;
rows.slice(0,20).forEach(r=>{
  md += `| ${r.detector} | ${r.old} | ${r.new} | ${r.delta} |\n`;
});
md += `\n## Full detector table\n\n`;
md += `| Detector | Baseline | New | Delta |\n|---|---:|---:|---:|\n`;
rows.forEach(r=> md += `| ${r.detector} | ${r.old} | ${r.new} | ${r.delta} |\n`);
fs.writeFileSync('reports/slither-detailed-diff-2025-10-30.md', md);
console.log('Wrote reports/slither-detailed-diff-2025-10-30.csv and .md');
