const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '..', 'coverage', 'coverage.json');
const MIN_LINES = parseFloat(process.env.MIN_LINES || '90');
const MIN_BRANCH = parseFloat(process.env.MIN_BRANCH || '85');

if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('coverage.json not found, run coverage first');
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));

const metrics = data && data.total ? data.total : null;
if (!metrics) {
  console.error('unexpected coverage.json format');
  process.exit(2);
}

const lines = metrics.lines.pct;
const branches = metrics.branches.pct;

console.log(`Coverage lines: ${lines}%  branches: ${branches}%`);

if (lines < MIN_LINES || branches < MIN_BRANCH) {
  console.error(`Coverage thresholds not met. Required lines >= ${MIN_LINES}%, branches >= ${MIN_BRANCH}%`);
  process.exit(1);
}

console.log('Coverage thresholds passed');
process.exit(0);
