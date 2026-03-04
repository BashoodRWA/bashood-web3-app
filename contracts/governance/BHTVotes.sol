// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Wrapper.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title BHTVotes
 * @author Bashood Protocol
 * @notice Governance-voting wrapper for BHT. 1 BHT deposited = 1 BHTv vote.
 *
 * @dev Users wrap BHT → BHTv to participate in BashoodGovernor votes.
 *      Unwrapping is free and instant: BHTv.withdrawTo(user, amount) → BHT returned.
 *
 *      Wrapping/unwrapping does NOT trigger BashoodToken's burn or treasury fee
 *      because ERC20Wrapper uses internal _mint/_burn, bypassing BashoodToken.transfer().
 *
 *      Delegation:
 *        - By default voting power is undelegated (self-delegation required).
 *        - Call delegate(address) or delegateBySig() to activate voting weight.
 *        - Voting snapshots use block numbers (default OZ v5 mode).
 *
 *      OZ v5 inheritance resolution:
 *        - ERC20Wrapper  (ERC20)
 *        - ERC20Votes    (ERC20 + Votes → EIP712 + Nonces)
 *        _update conflict resolved explicitly (see override below).
 *
 * @custom:security-contact security@bashood.com
 */
contract BHTVotes is ERC20Wrapper, ERC20Votes {

    /**
     * @param _bht  Address of the BashoodToken (BHT) ERC20 contract.
     */
    constructor(IERC20 _bht)
        ERC20("BashoodToken Votes", "BHTv")
        EIP712("BashoodToken Votes", "1")
        ERC20Wrapper(_bht)
    {}

    // ─── OZ v5 diamond resolution ─────────────────────────────────────────────

    /**
     * @dev Resolves _update ambiguity between ERC20Wrapper (→ERC20) and ERC20Votes.
     *      Delegates to ERC20Votes._update which handles voting-power checkpointing,
     *      and then calls ERC20._update internally via super chain.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    // ─── Decimals ─────────────────────────────────────────────────────────────
    /**
     * @dev Match BHT decimals (18). ERC20Wrapper already does this but be explicit.
     */
    function decimals()
        public
        pure
        override(ERC20, ERC20Wrapper)
        returns (uint8)
    {
        return 18;
    }
}
