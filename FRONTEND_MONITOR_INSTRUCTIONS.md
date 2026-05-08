Frontend monitor-only integration (warn-only)

Goal: run heuristic checks before enabling Approve/Buy. Start in monitor mode (logs & warnings), then move to block mode after tuning.

1) Import the monitor module

import { monitorToken } from './checkTokenMonitor';

2) Call before showing Approve button

const result = await monitorToken(provider, tokenAddress);
if (result.score > 0) {
  // Show warning banner with result.risks
  // Disable approve button by default and show an "I understand (expert)" checkbox
}

3) UX notes
- Start with warn-only to collect telemetry.
- Provide clear explanation and a one-click link to "Revoke allowance".
- Keep denylist.json in backend; check it first (fast) before running heuristics.

4) CI integration
- Add a job that runs `node scripts/static_scan.js <token>` for user-provided tokens when adding to allowlist.

5) Ops
- Maintain denylist.json in repo; review weekly and provide a contact for manual review.
