// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/standards/IBashoodRWA.sol";

/**
 * @title MockCoreForModules
 * @notice Mock minimal del BashoodCore (BashoodRWAReference) para tests de M4.
 *
 * @dev Provee únicamente las funciones que los módulos externos usan:
 *      - ownerOf(tokenId)           → validar existencia
 *      - getOperationalMetrics()    → OperationalMetricsAggregator
 *
 *      Un tokenId > 0 es considerado existente.
 *      tokenId == 0 revierte con "MockCore: token does not exist".
 *
 *      Las métricas operativas son configurables por tests con setMetrics().
 */
contract MockCoreForModules {

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev tokenId → owner address (simula el ERC721 mapping interno).
    mapping(uint256 => address) private _owners;

    /// @dev tokenId → métricas operativas configurables.
    mapping(uint256 => IBashoodRWA.OperationalMetrics) private _metrics;

    // ── Setup helpers (para tests) ────────────────────────────────────────

    /**
     * @notice Mintea un token asignándole un owner. Simula mintAsset().
     */
    function mint(uint256 tokenId, address owner_) external {
        require(tokenId > 0,       "MockCore: tokenId is zero");
        require(owner_ != address(0), "MockCore: zero owner");
        _owners[tokenId] = owner_;
    }

    /**
     * @notice Configura las métricas operativas de un token.
     */
    function setMetrics(
        uint256 tokenId,
        IBashoodRWA.OperationalMetrics calldata metrics
    ) external {
        _metrics[tokenId] = metrics;
    }

    // ── ERC721-compatible ──────────────────────────────────────────────────

    /**
     * @notice Devuelve el owner de un token. Revierte si el token no existe.
     * @dev Emula ERC721.ownerOf() — los módulos usan esta función solo para
     *      validar existencia del token.
     */
    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner_ = _owners[tokenId];
        require(owner_ != address(0), "ERC721NonexistentToken");
        return owner_;
    }

    // ── IBashoodRWA-compatible ────────────────────────────────────────────

    /**
     * @notice Devuelve las métricas operativas de un token.
     *         Si no se configuraron, devuelve struct con valores por defecto.
     */
    function getOperationalMetrics(uint256 tokenId)
        external
        view
        returns (IBashoodRWA.OperationalMetrics memory)
    {
        return _metrics[tokenId];
    }
}
