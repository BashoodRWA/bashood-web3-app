// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title BashoodTimelock
 * @author Bashood Protocol
 * @notice TimelockController for Bashood on-chain governance.
 *
 * @dev Wraps OpenZeppelin TimelockController v5 with Bashood-specific documentation.
 *
 *      Role structure (set at deployment):
 *        PROPOSER_ROLE   → BashoodGovernor (only governor can queue proposals)
 *        EXECUTOR_ROLE   → address(0)      (anyone can execute queued proposals)
 *        CANCELLER_ROLE  → BashoodGovernor (governor can cancel)
 *        DEFAULT_ADMIN   → address(0)      (no admin after init = fully decentralized)
 *
 *      Production minDelay: 172800 seconds (48 hours).
 *      Testing minDelay:    0 seconds.
 *
 *      This contract also acts as the on-chain treasury executor.
 *      BashoodTreasury grants SPENDER_ROLE to this contract's address.
 *
 * @custom:security-contact security@bashood.com
 */
contract BashoodTimelock is TimelockController {

    /**
     * @param minDelay   Minimum wait time (seconds) between queue and execute.
     *                   Production: 172800 (48h). Testing: 0.
     * @param proposers  Array of addresses that can queue proposals.
     *                   Should be [BashoodGovernor].
     * @param executors  Array of addresses that can execute.
     *                   Pass [address(0)] to allow anyone.
     * @param admin      Initial admin. Pass address(0) for trustless setup
     *                   (recommended for mainnet after initial configuration).
     */
    constructor(
        uint256          minDelay,
        address[] memory proposers,
        address[] memory executors,
        address          admin
    )
        TimelockController(minDelay, proposers, executors, admin)
    {}
}
