// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../oracles/IPriceFeed.sol";
import "../standards/IBashoodRWA.sol";
import "./IOracleValuation.sol";
import "./BashoodModuleBase.sol";

/**
 * @dev Minimal interface for the Core functions this module needs.
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

    function ASSET_MANAGER_ROLE() external view returns (bytes32);
}

/**
 * @title OracleValuationModule
 * @notice Primer módulo externo del protocolo Bashood. Conforme al patrón
 *         oficial IBashoodModule / BashoodModuleBase.
 *         Responsabilidad única: resolver el valor de mercado de un activo
 *         mediante un feed Chainlink y empujarlo al Core.
 *
 * @dev El Core no conoce este contrato; la autorización se gestiona
 *      exclusivamente por ASSET_MANAGER_ROLE (rol otorgado por el admin).
 *
 * Plan M4 – Fase 3.
 */
contract OracleValuationModule is IOracleValuation, BashoodModuleBase {

    // ── Identificadores del módulo ────────────────────────────────────────
    bytes32 public constant MODULE_IDENTIFIER = keccak256("OracleValuation/1.0");
    string  public constant MODULE_VER        = "1.0.0";

    // ── Configuración ────────────────────────────────────────────────────
    /// @notice Máximo de segundos que un round de Chainlink se considera fresco.
    uint256 public stalenessThreshold = 3600;

    // ── Events ───────────────────────────────────────────────────────────────
    event StalenessThresholdUpdated(uint256 newThreshold);

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address core_)
        BashoodModuleBase(
            core_,
            keccak256("OracleValuation/1.0"),
            "1.0.0",
            _fetchRole(core_)
        )
    {}

    /**
     * @dev Auxiliar: valida que core_ != address(0) antes de leer su rol.
     *      Necesario porque los argumentos al constructor base se evalúan
     *      antes de que BashoodModuleBase pueda comprobar la dirección.
     */
    function _fetchRole(address core_) private view returns (bytes32) {
        require(core_ != address(0), "OracleValuation: invalid core address");
        return ICoreValuationTarget(core_).ASSET_MANAGER_ROLE();
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

    // coreContract() es provisto por BashoodModuleBase.

    /**
     * @notice Resuelve el feed Chainlink del activo y empuja el valor al Core.
     * @dev Cualquiera puede llamar esta función; la autorización la aplica el
     *      Core mediante ASSET_MANAGER_ROLE sobre este contrato.
     * @param tokenId  ID del activo NFT a revaluar.
     */
    function pushValuation(uint256 tokenId) external override {
        _requireValidToken(tokenId);

        ICoreValuationTarget core_ = ICoreValuationTarget(_coreAddress());
        IBashoodRWA.TelemetryConfig memory cfg = core_.getTelemetryConfig(tokenId);

        require(
            cfg.oracleAddress != address(0),
            "OracleValuation: no oracle configured for token"
        );

        uint256 scaled = resolveValue(cfg.oracleAddress);

        emit ValuationPushed(tokenId, cfg.oracleAddress, scaled, 18, scaled);
        emit ModuleOperationExecuted(tokenId, msg.sender);

        core_.updateAssetValue(tokenId, scaled, "ORACLE_REVALUATION");
    }

    /**
     * @notice Read-only price resolution — normalises feed answer to 1e18.
     * @param priceFeed  Chainlink AggregatorV3-compatible feed address.
     * @return scaledValue  Price in USD, scaled to 1e18.
     */
    function resolveValue(address priceFeed)
        public
        view
        override
        returns (uint256 scaledValue)
    {
        _requireNotZero(priceFeed, "OracleValuation: zero feed address");

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

        // Normalizar a 1e18
        if (dec < 18) {
            scaledValue = raw * (10 ** uint256(18 - dec));
        } else if (dec > 18) {
            scaledValue = raw / (10 ** uint256(dec - 18));
        } else {
            scaledValue = raw;
        }
    }
}
