const fs = require('fs');
const path = require('path');
const buildInfoDir = path.join(__dirname, '..', 'artifacts', 'build-info');
const artifactsContractsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
if (!fs.existsSync(buildInfoDir)) {
  console.error('No build-info directory found at', buildInfoDir);
  process.exit(1);
}
const files = fs.readdirSync(buildInfoDir).map(f => ({
  name: f,
  full: path.join(buildInfoDir, f),
  mtime: fs.statSync(path.join(buildInfoDir, f)).mtimeMs
})).sort((a,b) => b.mtime - a.mtime);
if (files.length === 0) {
  console.error('No build-info files found');
  process.exit(1);
}
const latest = files[0];
console.log('Using build-info file:', latest.name);
let json;
try {
  json = JSON.parse(fs.readFileSync(latest.full, 'utf8'));
} catch (e) {
  console.error('Failed to parse build-info JSON:', e.message);
  process.exit(1);
}
const output = json.output || json.output;
if (!output || !output.contracts) {
  console.error('build-info has no output.contracts');
  process.exit(1);
}
console.log('\nContracts compiled (sourceName -> contract names):\n');
let found = false;
for (const sourceName of Object.keys(output.contracts)) {
  const names = Object.keys(output.contracts[sourceName]);
  console.log(`${sourceName} -> ${names.join(', ')}`);
  if (names.includes('ChainlinkPriceFeed') || sourceName.includes('ChainlinkPriceFeed')) found = true;
}
console.log('\nChainlinkPriceFeed present in this build-info? ', found ? 'YES' : 'NO');

console.log('\nArtifacts/contracts directory listing (top-level entries):\n');
if (fs.existsSync(artifactsContractsDir)) {
  const entries = fs.readdirSync(artifactsContractsDir);
  for (const e of entries) {
    console.log('-', e);
  }
} else {
  console.log('artifacts/contracts not found');
}

// If present, show whether artifacts/contracts/oracles exists
const oraclesDir = path.join(artifactsContractsDir, 'oracles');
console.log('\nartifacts/contracts/oracles exists? ', fs.existsSync(oraclesDir) ? 'YES' : 'NO');
if (fs.existsSync(oraclesDir)) {
  console.log('Contents:', fs.readdirSync(oraclesDir).join(', '));
}
