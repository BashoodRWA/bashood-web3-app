# Proposal: BashoodPresaleFinal - oracle usage & external calls triage

Problem
-------
Slither highlighted several patterns in `BashoodPresaleFinal` related to oracle usage and external calls:

- Multiple locations call `priceFeed.latestRoundData()` and then use `block.timestamp - updatedAt` to check staleness. Slither flags timestamp reliance and ignored return-values in some cases.
- External calls to `rescueContract` (delegateEmergencyWithdrawEth, delegateRescueUnsoldNfts, delegateRescueErc20) are used with try/catch; Slither flags external calls before state updates in some flows.
- `purchaseWithETH` and `purchaseWithBHT` perform state updates before external calls (good -> checks-effects-interactions), but there are multiple interactions (`projectWallet.call`, `nftContract.safeTransferFrom`, and `referralContract.rewardReferrer`) that must be robust.

Mitigation options
------------------
A. Test-only mitigations
  - Add tests that simulate stale oracle data and zero price (already present in test suite). Ensure tests cover corner cases where updatedAt == 0 and price == 0.
  - Add tests for a malicious `referralContract` that attempts to revert during `rewardReferrer` and verify the purchase still completes or is reverted as intended.
  - Add tests for `projectWallet` rejecting ETH transfer (already present as PoC). Ensure purchaseWithETH reverts as intended and does not corrupt state (checks/efffects maintained).

B. Small production hardening (requires approval)
  1) Centralize oracle access into a single internal function (already mostly done: `_bhtFromFiat`) and ensure all call sites use it consistently.
  2) Validate and strictly document the semantics of `priceFeed.latestRoundData()` return values and consider wrapping in a small `PriceFeedWrapper` contract to normalize behavior and make testing easier.
  3) For external calls to `referralContract.rewardReferrer`, consider wrapping in `try/catch` to avoid unexpected reverts from third-party referral implementations. Current code assumes referral won't revert; wrapping protects purchases.

Recommended action
------------------
- Immediate: expand tests to include malicious referral contract behaviors and oracle anomalies (already partially covered). This lowers risk and demonstrates real behavior.
- Medium-term (after tests): optionally wrap `referralContract.rewardReferrer` in `try/catch` to avoid third-party reverts from blocking purchases. This is a conservative, backward-compatible change.

Suggested minimal production patch (optional)
--------------------------------------------
Wrap rewardReferrer calls to protect purchase flows:

@@
- if (referrer != address(0)) {
-    referralContract.rewardReferrer(msg.sender, referrer);
- }
+ if (referrer != address(0)) {
+    try referralContract.rewardReferrer(msg.sender, referrer) {
+        // success
+    } catch {
+        // swallow revert from referral contract to avoid blocking purchase
+    }
+ }

Notes
-----
- Swallowing errors from `rewardReferrer` is a tradeoff: it guarantees purchases don't fail due to referral contract misbehavior, but it hides referral failures. Tests should observe referral invocation via mock that emits events and not rely on its success for critical state.
- Any production change must be approved; I'll prepare test-mocks PoC first.

Files to change (if approved)
----------------------------
- `contracts/BashoodPresaleFinal.sol` (small try/catch around `rewardReferrer`)
- Add tests/mocks in `test/` to demonstrate behavior.
