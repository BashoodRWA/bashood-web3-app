// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../standards/IBashoodRWA.sol";

/**
 * @title MockCoreForOracleValuation
 * @notice Mock mínimo del BashoodCore para tests de OracleValuationModule.
 *
 * @dev Implementa las tres funciones que OracleValuationModule consume:
 *      - ASSET_MANAGER_ROLE()        → devuelve un bytes32 constante
 *      - getTelemetryConfig(tokenId) → devuelve la config configurada
 *      - updateAssetValue(...)       → registra la llamada para aserciones
 */
contract MockCoreForOracleValuation {

    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    // ── Storage ───────────────────────────────────────────────────────────

    mapping(uint256 => IBashoodRWA.TelemetryConfig) private _telemetry;

    // Registro de la última llamada a updateAssetValue (para aserciones)
    uint256 public lastUpdatedTokenId;
    uint256 public lastUpdatedValue;
    string  public lastUpdatedReason;
    uint256 public updateCallCount;

    // ── Setup helpers ─────────────────────────────────────────────────────

    function setTelemetryConfig(
        uint256 tokenId,
        IBashoodRWA.TelemetryConfig calldata config
    ) external {
        _telemetry[tokenId] = config;
    }

    // ── ICoreValuationTarget ──────────────────────────────────────────────

    function getTelemetryConfig(uint256 tokenId)
        external
        view
        returns (IBashoodRWA.TelemetryConfig memory)
    {
        return _telemetry[tokenId];
    }

    function updateAssetValue(
        uint256 tokenId,
        uint256 newValue,
        string calldata reason
    ) external {
        lastUpdatedTokenId = tokenId;
        lastUpdatedValue   = newValue;
        lastUpdatedReason  = reason;
        updateCallCount   += 1;
    }
}
