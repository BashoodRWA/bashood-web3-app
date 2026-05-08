# Proposal: BashoodRescue emergencyWithdrawETH - triage & fixes

Problem
-------
Slither flagged `BashoodRescue.emergencyWithdrawETH(address)` as an "arbitrary-send-eth" pattern (high impact). The function performs a low-level `call{value: bal}()` to `projectWallet`:

- public function guarded by `onlyRole(EMERGENCY_ROLE)`
- computes `bal = address(this).balance`
- executes `(bool ok, ) = projectWallet.call{value: bal}("");` and `require(ok)`

Risk analysis
-------------
- Sending ETH with a low-level `call` transfers control to `projectWallet` if it's a contract. A malicious `projectWallet` could attempt to reenter the rescue contract or other contracts on the same system.
- In practice the function is guarded by `onlyRole(EMERGENCY_ROLE)`; a reentrant call to `emergencyWithdrawETH` would also require EMERGENCY_ROLE, which the fallback of `projectWallet` won't have. This lowers the practical exploitability.
- Still, call-based sends are a common source of issues and generate high-signal findings in automated scans.

Mitigation options
------------------
A. Test-only (no production code changes)
  - Add unit tests that simulate:
    - `projectWallet` that rejects ETH (already present as PoC in tests).
    - `projectWallet` that is a malicious contract attempting reentry into Rescue (confirm that role checks prevent damage).
  - Document the residual risk in the PR and in repo docs.

B. Production patch (minimal, conservative)
  1) Add `ReentrancyGuard` and mark `emergencyWithdrawETH` as `nonReentrant`.
     - Rationale: prevents reentrancy into any `nonReentrant` functions across the contract. Minimal surface change.
     - Code impact: import and contract inheritance change; add modifier to function.
  2) (Optional) Emit the `EmergencyEthWithdrawn` event before the external call and/or perform a checks-effects-interactions pattern where possible.
  3) (Optional) Require that `projectWallet` is an EOA (reject if contract) when calling emergency withdraw in the administrative setup. This prevents sending ETH to untrusted contracts but reduces flexibility.

Recommended action
------------------
- Immediate: add/extend unit tests (option A) so the CI demonstrates the behavior and documents the issue.
- With your explicit approval: apply production patch (option B.1) to add `nonReentrant` to `emergencyWithdrawETH`. This is low-risk and preserves current semantics while blocking reentrancy.

Suggested patch (production) - minimal
-------------------------------------
This is a suggested change; do NOT apply without approval.

@@
- contract BashoodRescue is AccessControl, IERC1155Receiver {
+ contract BashoodRescue is AccessControl, IERC1155Receiver, ReentrancyGuard {
@@
- function emergencyWithdrawETH(address payable projectWallet) external onlyRole(EMERGENCY_ROLE) {
+ function emergencyWithdrawETH(address payable projectWallet) external onlyRole(EMERGENCY_ROLE) nonReentrant {
     require(projectWallet != address(0), "Rescue: invalid wallet");
     uint256 bal = address(this).balance;
     require(bal > 0, "Rescue: no ETH");
     (bool ok, ) = projectWallet.call{value: bal}("");
     require(ok, "Rescue: ETH transfer failed");
     emit EmergencyEthWithdrawn(projectWallet, bal);
 }
@@
+// Note: import OpenZeppelin's ReentrancyGuard at top of file
+// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


Implementation notes
--------------------
- Adding `ReentrancyGuard` increases compiled bytecode slightly but gives meaningful protection.
- Tests should be updated/extended to cover a malicious `projectWallet` attempt to reenter, and to verify behavior when the project wallet is a contract that rejects ETH.

Files to change (if approved)
----------------------------
- `contracts/BashoodRescue.sol` (add import + inheritance + modifier)
- Update tests if needed (`test/`)


