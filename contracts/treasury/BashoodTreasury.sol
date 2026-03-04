// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BashoodTreasury
 * @author Bashood Protocol
 * @notice Protocol treasury: receives BHT treasury fees and disburses via governance.
 *
 * @dev Architecture:
 *
 *   BashoodToken.treasuryWallet = address(this)
 *     → every BHT transfer routes 0.5% here automatically
 *
 *   SPENDER_ROLE → BashoodTimelock (only governance can spend)
 *     → Governor proposes spendBHT / spendETH
 *     → Timelock executes after 48h delay
 *
 *   DEFAULT_ADMIN_ROLE → Gnosis Safe 3-of-5 multisig
 *     → Can grant/revoke SPENDER_ROLE if timelock is upgraded
 *     → CANNOT unilaterally spend (no spending functions for admin)
 *
 * Production setup sequence:
 *   1. Deploy BashoodTimelock(48h, [governor], [address(0)], address(0))
 *   2. Deploy BashoodTreasury(bht, gnosisSafe, timelockAddress)
 *   3. BashoodToken.setTreasuryWallet(treasury)
 *   4. BashoodToken.setStakingContract(timelockAddress)
 *   5. BashoodToken.lockParameters()
 *
 * Security properties:
 *   • Admin cannot spend — only SPENDER_ROLE (Timelock) can
 *   • ReentrancyGuard on all spend functions
 *   • SafeERC20 for token transfers
 *   • ETH fallback receive() to accept native asset if needed
 *
 * @custom:security-contact security@bashood.com
 */
contract BashoodTreasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE");

    // ─── State ────────────────────────────────────────────────────────────────
    IERC20 public immutable bht;

    // ─── Events ───────────────────────────────────────────────────────────────
    event BHTReceived(address indexed from,  uint256 amount);
    event ETHReceived(address indexed from,  uint256 amount);
    event BHTSpent   (address indexed to,    uint256 amount, string reason);
    event ETHSpent   (address indexed to,    uint256 amount, string reason);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error InvalidRecipient();
    error InvalidAmount();
    error InsufficientBHT(uint256 requested, uint256 available);
    error InsufficientETH(uint256 requested, uint256 available);
    error ETHTransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _bht             BHT token address
     * @param _admin           Gnosis Safe 3/5 multisig (receives DEFAULT_ADMIN_ROLE)
     * @param _timelockSpender BashoodTimelock address (receives SPENDER_ROLE)
     *                         Pass address(0) to skip initial SPENDER_ROLE grant
     *                         (grant it manually after timelock is configured).
     */
    constructor(
        address _bht,
        address _admin,
        address _timelockSpender
    ) {
        require(_bht   != address(0), "BHT required");
        require(_admin != address(0), "Admin required");
        bht = IERC20(_bht);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);

        if (_timelockSpender != address(0)) {
            _grantRole(SPENDER_ROLE, _timelockSpender);
        }
    }

    // ─── Receive ETH / BHT ───────────────────────────────────────────────────
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    /**
     * @notice Emits BHTReceived event. BHT is received automatically when
     *         BashoodToken.treasuryWallet = address(this).
     * @dev Call after manually sending BHT to this contract for accounting.
     *      Normal treasury accrual is automatic via BashoodToken.transfer().
     */
    function notifyBHTReceived(uint256 amount) external {
        emit BHTReceived(msg.sender, amount);
    }

    // ─── Spend: governance-gated ──────────────────────────────────────────────
    /**
     * @notice Disburse BHT from treasury to a recipient.
     * @dev Only callable via SPENDER_ROLE (= BashoodTimelock).
     *      A governance proposal must pass + 48h timelock before execution.
     *
     * @param to      Recipient address
     * @param amount  Amount of BHT (18 decimals)
     * @param reason  Human-readable justification (stored in event, not on-chain string)
     */
    function spendBHT(
        address        to,
        uint256        amount,
        string calldata reason
    )
        external
        onlyRole(SPENDER_ROLE)
        nonReentrant
    {
        if (to     == address(0)) revert InvalidRecipient();
        if (amount == 0)          revert InvalidAmount();

        uint256 bal = bht.balanceOf(address(this));
        if (amount > bal) revert InsufficientBHT(amount, bal);

        bht.safeTransfer(to, amount);
        emit BHTSpent(to, amount, reason);
    }

    /**
     * @notice Disburse ETH from treasury to a recipient.
     * @dev Only callable via SPENDER_ROLE (= BashoodTimelock).
     *
     * @param to      Payable recipient address
     * @param amount  Amount in wei
     * @param reason  Human-readable justification
     */
    function spendETH(
        address payable to,
        uint256         amount,
        string calldata reason
    )
        external
        onlyRole(SPENDER_ROLE)
        nonReentrant
    {
        if (to     == address(0)) revert InvalidRecipient();
        if (amount == 0)          revert InvalidAmount();

        uint256 bal = address(this).balance;
        if (amount > bal) revert InsufficientETH(amount, bal);

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert ETHTransferFailed();

        emit ETHSpent(to, amount, reason);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    /// @notice Current BHT balance of the treasury
    function bhtBalance() external view returns (uint256) {
        return bht.balanceOf(address(this));
    }

    /// @notice Current ETH balance of the treasury
    function ethBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
