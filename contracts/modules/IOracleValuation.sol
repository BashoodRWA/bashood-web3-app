// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOracleValuation
 * @notice Interfaz del módulo externo de tasación por oráculo del protocolo Bashood.
 *
 * ════════════════════════════════════════════════════════════════════════
 * ACTUALIZADOR CANONÍCO DEL VALOR ECONÓMICO — Plan M4 / BASHOOD-RWA-1
 * ════════════════════════════════════════════════════════════════════════
 *
 * Este módulo es el único actualizador autorizado de
 * `FinancialData.currentValue` en el Core (BashoodRWAReference) durante
 * la operación normal del protocolo.
 *
 * FLUJO OFICIAL DE VALORACIÓN
 * ───────────────────────────
 * 1. El admin configura el feed Chainlink del activo:
 *      Core.configureTelemetry(tokenId, { oracleAddress: feedAddress, ... })
 * 2. El admin otorga rol al módulo:
 *      Core.grantRole(ASSET_MANAGER_ROLE, address(OracleValuationModule))
 * 3. Cualquier cuenta llama en el momento deseado:
 *      OracleValuationModule.pushValuation(tokenId)
 *    El módulo resuelve el feed, normaliza a 1e18 y escribe en Core.
 * 4. El Core emite AssetValueUpdated con reason="ORACLE_REVALUATION".
 *
 * PROHIBICIONES
 * ─────────────
 * · En producción, no se debe llamar Core.updateAssetValue() directamente
 *   salvo emergencia documentada con reason="ADMIN_APPRAISAL".
 * · Este módulo no tiene cursor de valoración propio; la fuente de
 *   verdad económica siempre es Core.getFinancialData(tokenId).currentValue.
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

    // coreContract() se hereda de IBashoodModule — no se redeclara aquí.
}
