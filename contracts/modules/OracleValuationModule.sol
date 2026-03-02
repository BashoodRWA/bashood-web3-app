// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../oracles/IPriceFeed.sol";
import "../standards/IBashoodRWA.sol";
import "./IOracleValuation.sol";

/**
 * @dev Minimal interface for the Core functions the module needs.
 *      Avoids importing the full BashoodRWAReference.
 */
interface ICoreValuationTarget {
    function getTelemetryConfig(uint256 tokenId)
        external view returns (IBashoodRWA.TelemetryConfig memory);

    function updateAssetValue(
        uint256 tokenId,
        uint256 newValue,
        string calldata reason
    ) external;
}

/**
 * @title OracleValuationModule
 * @notice External module responsible for resolving asset market value via
 *         Chainlink price feeds and pushing the result to BashoodCore.
 *
 * @dev Reads the feed address from TelemetryConfig.oracleAddress stored in Core.
 *      Normalises the raw Chainlink answer to 1e18 (USD) and calls
 *      Core.updateAssetValue().  The Core must authorise this contract via
 *      setOracleModule() before any push succeeds.
 *
 * Plan M4 – Fase 3: externalización de tasación por oráculo.
 */
contract OracleValuationModule is IOracleValuation, Ownable {

    // ── Immutable ────────────────────────────────────────────────────────────
    address private immutable _coreContract;

    // ── Configuration ────────────────────────────────────────────────────────
    /// @notice Maximum seconds a Chainlink round is considered fresh.
    uint256 public stalenessThreshold = 3600; // 1 hour default

    // ── Events ───────────────────────────────────────────────────────────────
    event StalenessThresholdUpdated(uint256 newThreshold);

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address core_) Ownable(msg.sender) {
        require(core_ != address(0), "OracleValuation: invalid core address");
        _coreContract = core_;
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Update the staleness threshold for price-feed validation.
     * @param threshold_ Maximum age in seconds for a valid Chainlink round.
     */
    function setStalenessThreshold(uint256 threshold_) external onlyOwner {
        require(threshold_ >= 60, "OracleValuation: threshold too low");
        stalenessThreshold = threshold_;
        emit StalenessThresholdUpdated(threshold_);
    }

    // ── IOracleValuation ─────────────────────────────────────────────────────

    /// @inheritdoc IOracleValuation
    function coreContract() external view override returns (address) {
        return _coreContract;
    }

    /**
     * @notice Resolve the Chainlink feed for `tokenId` and push the value to Core.
     * @dev Callable by anyone — the Core enforces authorisation via _oracleModule.
     * @param tokenId  Asset NFT id to revalue.
     */
    function pushValuation(uint256 tokenId) external override {
        ICoreValuationTarget core = ICoreValuationTarget(_coreContract);
        IBashoodRWA.TelemetryConfig memory cfg = core.getTelemetryConfig(tokenId);

        require(cfg.oracleAddress != address(0), "OracleValuation: no oracle configured for token");

        uint256 scaled = resolveValue(cfg.oracleAddress);

        emit ValuationPushed(tokenId, cfg.oracleAddress, scaled, 18, scaled);

        core.updateAssetValue(tokenId, scaled, "ORACLE_REVALUATION");
    }

    /**
     * @notice Read-only price resolution — normalises feed answer to 1e18.
     * @param priceFeed  Chainlink AggregatorV3-compatible feed address.
     * @return scaledValue  Price in USD, scaled to 1e18.
     */
    function resolveValue(address priceFeed) public view override returns (uint256 scaledValue) {
        require(priceFeed != address(0), "OracleValuation: zero feed address");

        IPriceFeed feed = IPriceFeed(priceFeed);

        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound)
            = feed.latestRoundData();

        require(answer > 0,                        "OracleValuation: non-positive price");
        require(updatedAt != 0,                    "OracleValuation: stale updatedAt=0");
        require(answeredInRound >= roundId,         "OracleValuation: stale round");
        require(
            block.timestamp - updatedAt <= stalenessThreshold,
            "OracleValuation: staleness threshold exceeded"
        );

        uint8 dec = feed.decimals();
        uint256 raw = uint256(answer);

        // Normalise to 1e18
        if (dec < 18) {
            scaledValue = raw * (10 ** uint256(18 - dec));
        } else if (dec > 18) {
            scaledValue = raw / (10 ** uint256(dec - 18));
        } else {
            scaledValue = raw;
        }
    }
}
