// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./BashoodTimelock.sol";

/**
 * @title BashoodGovernor
 * @author Bashood Protocol
 * @notice On-chain governance for the Bashood protocol.
 *
 * @dev Voting token: BHTv (BHTVotes). 1 BHTv = 1 vote.
 *      Users must wrap BHT → BHTv (depositFor) and delegate before voting.
 *
 *      Governance parameters:
 *        votingDelay      : 7200 blocks  (~1 day  on Base L2 @ ~2s / block)
 *        votingPeriod     : 50400 blocks  (~1 week on Base L2)
 *        proposalThreshold: 100,000 BHTv  (anti-spam — ~0.01% of supply)
 *        quorum           : 4% of total BHTv supply at snapshot block
 *
 *      Execution flow:
 *        1. Propose                → voting starts after votingDelay
 *        2. Vote                   → open for votingPeriod blocks
 *        3. Queue (if passed)      → enters BashoodTimelock (48h delay on mainnet)
 *        4. Execute (after delay)  → calls target contracts
 *
 *      Governable actions (examples):
 *        • BashoodToken.setBurnRate / setTreasuryFee (pre-lockParameters only)
 *        • BashoodRWAReference: grant/revoke ASSET_MANAGER_ROLE
 *        • BashoodTreasury.spendBHT / spendETH
 *        • Protocol module upgrades via UPGRADER_ROLE
 *        • BashoodVesting revoke() for team vesting (if revocable)
 *
 *      OZ v5 note: all required abstract overrides are implemented below.
 *
 * @custom:security-contact security@bashood.com
 */
contract BashoodGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /**
     * @param _token     BHTVotes token (IVotes) — wraps BHT for governance
     * @param _timelock  BashoodTimelock controller (executes passed proposals)
     */
    constructor(
        IVotes           _token,
        BashoodTimelock  _timelock
    )
        Governor("BashoodGovernor")
        GovernorSettings(
            7200,               // votingDelay:       ~1 day  in blocks (Base L2 ~2s/block)
            50400,              // votingPeriod:      ~1 week in blocks
            100_000 * 10**18    // proposalThreshold: 100k BHTv
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)   // 4% quorum of total BHTv supply
        GovernorTimelockControl(_timelock)
    {}

    // ─── Required overrides (OZ v5 multi-inheritance) ────────────────────────

    function votingDelay()
        public view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function proposalThreshold()
        public view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function quorum(uint256 blockNumber)
        public view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256          proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        bytes32          descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint48)
    {
        return super._queueOperations(
            proposalId,
            targets,
            values,
            calldatas,
            descriptionHash
        );
    }

    function _executeOperations(
        uint256          proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        bytes32          descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._executeOperations(
            proposalId,
            targets,
            values,
            calldatas,
            descriptionHash
        );
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        bytes32          descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
