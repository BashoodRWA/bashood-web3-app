// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FeeDiscountModule
 * @author Bashood Protocol
 * @notice Computes BHT-holder fee discounts for Bashood protocol operations.
 *
 * @dev Discount tiers based on real-time BHT balance (no lock required):
 *
 *   ┌──────┬──────────────────────────┬───────────────┐
 *   │ Tier │ BHT Balance              │ Discount      │
 *   ├──────┼──────────────────────────┼───────────────┤
 *   │  0   │ < 10,000 BHT             │   0%  (full)  │
 *   │  1   │ 10,000 – 99,999 BHT      │  20%          │
 *   │  2   │ 100,000 – 999,999 BHT    │  40%          │
 *   │  3   │ ≥ 1,000,000 BHT          │  60%          │
 *   └──────┴──────────────────────────┴───────────────┘
 *
 *   Source: LITEPAPER.md — "Holders reciben hasta 60% de descuento en fees de registro"
 *
 * Integration:
 *   Protocol contracts call `computeFee(user, baseFee)` to get the discounted fee.
 *   This module is READ-ONLY from the protocol perspective; it never moves tokens.
 *
 * Admin note:
 *   Owner can adjust thresholds and discount rates within limits
 *   (max discount capped at MAX_DISCOUNT = 9000 = 90% to preserve fee floor).
 *
 * @custom:security-contact security@bashood.com
 */
contract FeeDiscountModule is Ownable {

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_DISCOUNT  = 9000; // 90% in basis points — absolute cap
    uint256 public constant DENOMINATOR   = 10000;

    // ─── State ────────────────────────────────────────────────────────────────
    IERC20 public immutable bht;

    // Tier thresholds (BHT, 18 decimals)
    uint256 public tier1Threshold  = 10_000    * 10**18; // Tier 1 floor
    uint256 public tier2Threshold  = 100_000   * 10**18; // Tier 2 floor
    uint256 public tier3Threshold  = 1_000_000 * 10**18; // Tier 3 floor

    // Discount rates in basis points (DENOMINATOR = 10000)
    uint256 public tier0Discount = 0;    //  0% → full fee
    uint256 public tier1Discount = 2000; // 20% discount
    uint256 public tier2Discount = 4000; // 40% discount
    uint256 public tier3Discount = 6000; // 60% discount

    // ─── Events ───────────────────────────────────────────────────────────────
    event ThresholdUpdated(uint8 indexed tier, uint256 oldThreshold, uint256 newThreshold);
    event DiscountUpdated(uint8 indexed tier, uint256 oldDiscount,   uint256 newDiscount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error DiscountExceedsCap(uint256 discount, uint256 cap);
    error InvalidThresholdOrder();

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _bht    BHT token address (read-only: only balanceOf is called)
     * @param _owner  Admin address (Gnosis Safe / deployer)
     */
    constructor(address _bht, address _owner) Ownable(_owner) {
        require(_bht != address(0), "BHT required");
        bht = IERC20(_bht);
    }

    // ─── Core: read-only API for protocol contracts ───────────────────────────
    /**
     * @notice Returns the discount tier for a given user address.
     * @param user  Address to check (uses current BHT balance snapshot)
     * @return tier 0 = no discount, 3 = max discount
     */
    function getTier(address user) public view returns (uint8 tier) {
        uint256 balance = bht.balanceOf(user);
        if (balance >= tier3Threshold) return 3;
        if (balance >= tier2Threshold) return 2;
        if (balance >= tier1Threshold) return 1;
        return 0;
    }

    /**
     * @notice Returns the discount in basis points for a user.
     * @param user  Address to check
     * @return discount  Discount in basis points (e.g. 2000 = 20%)
     */
    function getDiscount(address user) public view returns (uint256 discount) {
        return _discountForTier(getTier(user));
    }

    /**
     * @notice Applies discount to `baseFee` and returns the discounted amount.
     * @param user     Address of the user initiating the action
     * @param baseFee  Full protocol fee before any discount
     * @return         Fee after applying tier discount
     */
    function computeFee(address user, uint256 baseFee) external view returns (uint256) {
        uint256 discount = getDiscount(user);
        return baseFee - (baseFee * discount) / DENOMINATOR;
    }

    /**
     * @notice Returns full tier information for a user in a single call.
     * @return tier      0–3
     * @return discount  basis points
     * @return balance   current BHT balance
     */
    function userInfo(address user)
        external
        view
        returns (uint8 tier, uint256 discount, uint256 balance)
    {
        balance  = bht.balanceOf(user);
        tier     = getTier(user);
        discount = _discountForTier(tier);
    }

    // ─── Admin: thresholds ────────────────────────────────────────────────────
    /**
     * @notice Update tier thresholds. Must maintain tier1 < tier2 < tier3.
     * @param t1 New Tier 1 threshold (BHT, 18 decimals)
     * @param t2 New Tier 2 threshold
     * @param t3 New Tier 3 threshold
     */
    function setThresholds(uint256 t1, uint256 t2, uint256 t3) external onlyOwner {
        if (t1 >= t2 || t2 >= t3) revert InvalidThresholdOrder();
        emit ThresholdUpdated(1, tier1Threshold, t1);
        emit ThresholdUpdated(2, tier2Threshold, t2);
        emit ThresholdUpdated(3, tier3Threshold, t3);
        tier1Threshold = t1;
        tier2Threshold = t2;
        tier3Threshold = t3;
    }

    // ─── Admin: discounts ─────────────────────────────────────────────────────
    /**
     * @notice Update all discount rates at once.
     * @param d0 Tier 0 discount (typically 0)
     * @param d1 Tier 1 discount
     * @param d2 Tier 2 discount
     * @param d3 Tier 3 discount (max)
     */
    function setDiscounts(uint256 d0, uint256 d1, uint256 d2, uint256 d3) external onlyOwner {
        if (d0 > MAX_DISCOUNT || d1 > MAX_DISCOUNT || d2 > MAX_DISCOUNT || d3 > MAX_DISCOUNT) {
            revert DiscountExceedsCap(
                d0 > d3 ? d0 : d3,  // approximation — revert with the problematic value
                MAX_DISCOUNT
            );
        }
        emit DiscountUpdated(0, tier0Discount, d0);
        emit DiscountUpdated(1, tier1Discount, d1);
        emit DiscountUpdated(2, tier2Discount, d2);
        emit DiscountUpdated(3, tier3Discount, d3);
        tier0Discount = d0;
        tier1Discount = d1;
        tier2Discount = d2;
        tier3Discount = d3;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _discountForTier(uint8 tier) internal view returns (uint256) {
        if (tier == 3) return tier3Discount;
        if (tier == 2) return tier2Discount;
        if (tier == 1) return tier1Discount;
        return tier0Discount;
    }
}
