// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BashoodVesting
 * @author Bashood Protocol
 * @notice Multi-beneficiary cliff + linear vesting for BHT presale, team, and advisors.
 *
 * @dev Schedule types per TOKENOMICS.md v1.1:
 *
 *   PRESALE  (250M BHT)  tgePercent=20%, cliff=0m,  linear=12m
 *   TEAM     (150M BHT)  tgePercent=0%,  cliff=24m, linear=36m
 *   ADVISORS (50M  BHT)  tgePercent=0%,  cliff=12m, linear=24m
 *   ECOSYSTEM (200M BHT) tgePercent=0%,  cliff=6m,  linear=42m
 *
 * Tokens are pulled from owner into this contract when createSchedule() is called.
 * The owner must approve(BashoodVesting, totalAmount) before calling createSchedule().
 *
 * Security model:
 *  - Only OWNER can create or revoke schedules
 *  - Beneficiaries claim independently via release()
 *  - Revoking releases claimable to beneficiary first, unvested returns to owner
 *  - No admin bypass to claim on behalf of beneficiary
 *
 * @custom:security-contact security@bashood.com
 */
contract BashoodVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Token ────────────────────────────────────────────────────────────────
    IERC20 public immutable token;

    // ─── Schedule ─────────────────────────────────────────────────────────────
    struct VestingSchedule {
        uint256 totalAmount;   // Total BHT allocated to beneficiary
        uint256 tgeAmount;     // Released immediately at startTimestamp (TGE unlock)
        uint256 cliffEnd;      // Timestamp after which linear vesting begins
        uint256 vestingEnd;    // Timestamp when fully vested
        uint256 released;      // Cumulative BHT already released
        bool    revocable;     // Can owner revoke unvested portion?
        bool    initialized;   // Slot used flag
    }

    mapping(address => VestingSchedule) public schedules;
    address[]                           public beneficiaries;

    // ─── Events ───────────────────────────────────────────────────────────────
    event ScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 tgeAmount,
        uint256 cliffEnd,
        uint256 vestingEnd,
        bool    revocable
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event ScheduleRevoked(address indexed beneficiary, uint256 returnedToOwner);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NoSchedule();
    error ScheduleExists();
    error NothingToRelease();
    error NotRevocable();
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidTgePercent();
    error InvalidVestingDuration();

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _token  BHT token address
     * @param _owner  Deployer / multisig that manages schedules
     */
    constructor(address _token, address _owner) Ownable(_owner) {
        require(_token != address(0), "Token required");
        token = IERC20(_token);
    }

    // ─── Owner: create schedule ────────────────────────────────────────────────
    /**
     * @notice Create a vesting schedule for a beneficiary.
     *
     * @param beneficiary       Recipient of the vested tokens
     * @param totalAmount       Total BHT to be vested (e.g. 250_000_000e18)
     * @param tgePercent        Percentage released immediately [0–100], e.g. 20 for 20%
     * @param startTimestamp    Unix timestamp when vesting begins (usually TGE date)
     * @param cliffMonths       Months before linear vesting starts  (0 = no cliff)
     * @param vestingMonths     Months of linear vesting AFTER cliff (must be > 0)
     * @param revocable         Whether unvested tokens can be reclaimed by owner
     *
     * @dev Pulls `totalAmount` BHT from msg.sender into this contract.
     *      Caller must approve() this contract first.
     */
    function createSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 tgePercent,
        uint256 startTimestamp,
        uint256 cliffMonths,
        uint256 vestingMonths,
        bool    revocable
    ) external onlyOwner {
        if (beneficiary == address(0))                 revert InvalidBeneficiary();
        if (schedules[beneficiary].initialized)        revert ScheduleExists();
        if (totalAmount == 0)                          revert InvalidAmount();
        if (tgePercent > 100)                          revert InvalidTgePercent();
        if (vestingMonths == 0)                        revert InvalidVestingDuration();

        // Pull tokens into this contract FIRST to measure actual received amount.
        // BHT is a fee-on-transfer token (burn 0.1% + treasury 0.5% on every transfer).
        // Recording actual received prevents over-committing when fees reduce the amount.
        uint256 balBefore    = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        uint256 actualAmount = token.balanceOf(address(this)) - balBefore;

        // Recalculate based on what actually arrived.
        uint256 actualTge = (actualAmount * tgePercent) / 100;
        uint256 cliffEnd  = startTimestamp + (cliffMonths  * 30 days);
        uint256 vestingEnd = cliffEnd      + (vestingMonths * 30 days);

        schedules[beneficiary] = VestingSchedule({
            totalAmount:  actualAmount,
            tgeAmount:    actualTge,
            cliffEnd:     cliffEnd,
            vestingEnd:   vestingEnd,
            released:     0,
            revocable:    revocable,
            initialized:  true
        });

        beneficiaries.push(beneficiary);

        emit ScheduleCreated(
            beneficiary,
            actualAmount,
            actualTge,
            cliffEnd,
            vestingEnd,
            revocable
        );
    }

    // ─── Beneficiary: release ─────────────────────────────────────────────────
    /**
     * @notice Release all currently claimable BHT to the caller.
     * @dev Caller must have an active schedule. Safe to call multiple times.
     */
    function release() external nonReentrant {
        VestingSchedule storage s = schedules[msg.sender];
        if (!s.initialized) revert NoSchedule();

        uint256 amount = _claimable(s);
        if (amount == 0) revert NothingToRelease();

        s.released += amount;
        token.safeTransfer(msg.sender, amount);

        emit TokensReleased(msg.sender, amount);
    }

    // ─── Owner: revoke ────────────────────────────────────────────────────────
    /**
     * @notice Revoke a revocable schedule.
     *         Releases any claimable tokens to the beneficiary first,
     *         then returns unvested tokens to owner.
     * @param beneficiary Address whose schedule to revoke
     */
    function revoke(address beneficiary) external onlyOwner nonReentrant {
        VestingSchedule storage s = schedules[beneficiary];
        if (!s.initialized)  revert NoSchedule();
        if (!s.revocable)    revert NotRevocable();

        // Release claimable portion to beneficiary first
        uint256 claimableNow = _claimable(s);
        if (claimableNow > 0) {
            s.released += claimableNow;
            token.safeTransfer(beneficiary, claimableNow);
            emit TokensReleased(beneficiary, claimableNow);
        }

        uint256 unvested = s.totalAmount - s.released;
        s.initialized = false; // mark revoked

        if (unvested > 0) {
            token.safeTransfer(owner(), unvested);
        }

        emit ScheduleRevoked(beneficiary, unvested);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    /**
     * @notice Returns how many BHT can be claimed right now by `beneficiary`.
     */
    function claimable(address beneficiary) external view returns (uint256) {
        VestingSchedule storage s = schedules[beneficiary];
        if (!s.initialized) return 0;
        return _claimable(s);
    }

    /**
     * @notice Returns the vested (= unlocked) amount at the current block timestamp.
     */
    function vested(address beneficiary) external view returns (uint256) {
        VestingSchedule storage s = schedules[beneficiary];
        if (!s.initialized) return 0;
        return _vestedAmount(s);
    }

    /**
     * @notice Number of active + revoked beneficiaries ever registered.
     */
    function beneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _claimable(VestingSchedule storage s) internal view returns (uint256) {
        uint256 v = _vestedAmount(s);
        return v > s.released ? v - s.released : 0;
    }

    /**
     * @dev Piecewise vesting:
     *   [0, cliffEnd)         → only tgeAmount is vested
     *   [cliffEnd, vestingEnd) → tgeAmount + linear portion
     *   [vestingEnd, ∞)        → totalAmount fully vested
     */
    function _vestedAmount(VestingSchedule storage s) internal view returns (uint256) {
        if (block.timestamp < s.cliffEnd) {
            return s.tgeAmount;
        }
        if (block.timestamp >= s.vestingEnd) {
            return s.totalAmount;
        }
        // Linear portion between cliffEnd and vestingEnd
        uint256 duration       = s.vestingEnd - s.cliffEnd;
        uint256 elapsed        = block.timestamp - s.cliffEnd;
        uint256 linearAmount   = s.totalAmount - s.tgeAmount;
        uint256 linearVested   = (linearAmount * elapsed) / duration;
        return s.tgeAmount + linearVested;
    }
}
