// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOracleValuation
 * @notice Interface for the external oracle valuation module.
 * @dev Decouples Chainlink price-feed resolution from BashoodCore storage.
 *      The module is authorised on the Core via setOracleModule() and calls
 *      updateAssetValue() to push the resolved price.
 *
 * Plan M4 – Fase 3: externalización de tasación por oráculo.
 */
interface IOracleValuation {

    // ── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a valuation is pushed to the Core.
    event ValuationPushed(
        uint256 indexed tokenId,
        address indexed priceFeed,
        uint256 rawPrice,
        uint8   decimals,
        uint256 scaledValue
    );

    // ── Core functions ───────────────────────────────────────────────────────

    /**
     * @notice Resolve the current market value for a tokenId and push it to the Core.
     * @dev Reads TelemetryConfig.oracleAddress from the Core, queries the Chainlink
     *      feed, scales to 1e18, and calls Core.updateAssetValue().
     * @param tokenId  The asset NFT id to revalue.
     */
    function pushValuation(uint256 tokenId) external;

    /**
     * @notice Read-only preview: resolve the scaled value without writing state.
     * @param priceFeed  Chainlink AggregatorV3-compatible feed address.
     * @return scaledValue  Price normalised to 1e18 (USD).
     */
    function resolveValue(address priceFeed) external view returns (uint256 scaledValue);

    /**
     * @notice Address of the BashoodCore contract this module is bound to.
     */
    function coreContract() external view returns (address);
}
