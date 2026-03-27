// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BashoodRWAReference.sol";

/**
 * @title BashoodRWAReferenceV2
 * @notice UUPS upgrade implementation V2 — añade integridad de metadatos on-chain.
 *
 * @dev Esta es la implementación V2 del proxy UUPS desplegado en producción.
 *      Hereda de BashoodRWAReference (V1) y extiende su funcionalidad con:
 *
 *      1. `mintAssetV2(... bytes32 metadataHash)` — mint con hash de metadatos
 *      2. `getMetadataHash(uint256)` — getter del hash almacenado
 *      3. `verifyMetadata(uint256, bytes32)` — verificación de integridad
 *      4. `version()` — identificador de versión
 *
 * STORAGE LAYOUT
 * ──────────────
 * V1 storage (slots 0–60): _nextTokenId, _assetIdentification[], ..., __gap[47]
 * V2 storage (slots 61+):  _metadataHashes[], __gapV2[49]
 *
 * El __gap[47] de V1 queda intacto para evolución futura de V1.
 * V2 gestiona su propia reserva con __gapV2[49].
 *
 * REGLA DE CANONICALIZACIÓN (RFC 8785)
 * ──────────────────────────────────────
 * El metadataHash debe ser: keccak256(utf8Bytes(canonicalJson)) donde
 * canonicalJson es el JSON con:
 *   - Claves ordenadas lexicográficamente (Unicode code point)
 *   - Sin whitespace (sin espacios, sin saltos de línea)
 *   - Sin campos null o undefined
 *   - Encoding UTF-8
 * El mismo bytes exacto que se hashea ES el fichero subido a IPFS.
 *
 * UNIDADES FINANCIERAS
 * ─────────────────────
 * purchasePrice y currentValue en USD × 1e18 (uint256).
 * Validar que purchasePrice ≤ 1e27 antes del mint para evitar overflow al escalar.
 *
 * ENUM MAPPING (assetClass JSON → AssetCategory on-chain)
 * ─────────────────────────────────────────────────────────
 * "CONSTRUCTION_GANTRY"  → CONSTRUCTION_3D_PRINTER_GANTRY  (0)
 * "CONSTRUCTION_MOBILE"  → CONSTRUCTION_3D_PRINTER_MOBILE  (1)
 * "MODULAR_FACTORY"      → MODULAR_FACTORY_UV              (2)
 * "MACHINERY"            → HEAVY_VEHICLE                   (3)
 * "ENERGY"               → ENERGY_EQUIPMENT                (4)
 * "LOGISTICS"            → LOGISTICS_INFRASTRUCTURE        (5)
 * "RAW_MATERIALS"        → RAW_MATERIALS                   (6)
 * "REAL_ESTATE"          → REAL_ESTATE                     (7)
 * "UAV_FLEET"            → HEAVY_VEHICLE                   (3) ← fallback hasta V3
 *
 * @author Bashood Protocol Team
 * @custom:security-contact security@bashood.com
 * @custom:version 2.0.0
 */
contract BashoodRWAReferenceV2 is BashoodRWAReference {

    // ============ V2 State Variables ============

    /// @dev Hash de integridad del JSON canónico por tokenId.
    ///      Almacenado en el slot 61 (después de los 47 slots del __gap de V1).
    ///      bytes32(0) indica que el token fue minteado con V1 sin hash.
    mapping(uint256 => bytes32) internal _metadataHashes;

    /// @dev Storage gap para upgrades V3+. 49 slots reservados.
    uint256[49] private __gapV2;

    // ============ Custom Errors ============
    error MetadataHashRequired();
    error TokenHasNoStoredHash();
    error MetadataHashMismatch();

    // ============ Events ============

    /**
     * @notice Emitido al almacenar un hash de metadatos en el mint V2.
     * @param tokenId   ID del token minteado.
     * @param hash      keccak256 del JSON canónico almacenado en IPFS.
     */
    event MetadataHashStored(uint256 indexed tokenId, bytes32 indexed hash);

    // ============ Core V2 Mint Function ============

    /**
     * @notice Mintea un NFT de activo industrial con hash de integridad de metadatos.
     *
     * @dev Reemplaza a `mintAsset` para todos los nuevos mints en V2.
     *      La función `mintAsset` (6 parámetros) de V1 sigue disponible
     *      para compatibilidad retroactiva, pero no almacena hash.
     *
     *      PRE-CONDICIONES (validadas por el backend antes de llamar):
     *      - El JSON canónico ya está subido a IPFS en `metadataURI`
     *      - `metadataHash` = keccak256(utf8(canonicalJson))
     *      - `financials.purchasePrice` y `financials.currentValue` en USD × 1e18
     *      - `financials.purchasePrice` ≤ 1e27
     *
     *      EXTENSIBILIDAD: nuevos tipos de activos (drones, robots, etc.) no
     *      requieren modificación de este contrato. La categoría on-chain usa el
     *      enum `AssetCategory` (fallback a HEAVY_VEHICLE para tipos futuros),
     *      y el tipo exacto vive en `extensions.*` del JSON.
     *
     * @param to             Dirección receptora del token.
     * @param identification Datos de identificación del activo.
     * @param specs          Especificaciones técnicas (campos no aplicables = 0, válido).
     * @param financials     Datos financieros (valores en USD × 1e18).
     * @param operational    Métricas operacionales iniciales.
     * @param metadataURI    URI IPFS completa ("ipfs://<CID>") del JSON canónico.
     * @param metadataHash   keccak256 de los bytes UTF-8 del JSON canónico exacto subido a IPFS.
     * @return tokenId       ID del token minteado.
     */
    function mintAssetV2(
        address to,
        AssetIdentification calldata identification,
        TechnicalSpecs calldata specs,
        FinancialData calldata financials,
        OperationalMetrics calldata operational,
        string calldata metadataURI,
        bytes32 metadataHash
    ) external onlyRole(ASSET_MANAGER_ROLE) returns (uint256) {
        if (metadataHash == bytes32(0)) revert MetadataHashRequired();

        // _mintAssetCore realiza los checks de to/purchasePrice/currentValue,
        // escribe todo el storage, actualiza índices y emite AssetMinted.
        uint256 tokenId = _mintAssetCore(to, identification, specs, financials, operational, metadataURI);

        _metadataHashes[tokenId] = metadataHash;

        emit MetadataHashStored(tokenId, metadataHash);

        return tokenId;
    }

    // ============ Integrity Verification ============

    /**
     * @notice Devuelve el hash keccak256 del JSON canónico almacenado en el mint V2.
     * @dev Devuelve bytes32(0) si el token fue minteado con V1 `mintAsset` (sin hash).
     *      No revierte para tokens inexistentes — devuelve bytes32(0).
     * @param tokenId ID del token.
     * @return Hash almacenado, o bytes32(0) si no aplica.
     */
    function getMetadataHash(uint256 tokenId) external view returns (bytes32) {
        return _metadataHashes[tokenId];
    }

    /**
     * @notice Verifica que un hash dadocoindice con el hash almacenado on-chain.
     *
     * @dev Flujo de verificación off-chain:
     *      1. Fetch del JSON desde tokenURI(tokenId) (IPFS)
     *      2. Aplicar canonicalización RFC 8785
     *      3. keccak256(utf8Bytes) → claimedHash
     *      4. Llamar verifyMetadata(tokenId, claimedHash)
     *
     * @param tokenId     ID del token a verificar.
     * @param claimedHash Hash a comparar con el valor almacenado.
     * @return true si los hashes coinciden.
     *
     * @dev Reverts:
     *      - `TokenHasNoStoredHash` si el token fue minteado con V1.
     *      - `MetadataHashMismatch` si los hashes no coinciden.
     */
    function verifyMetadata(uint256 tokenId, bytes32 claimedHash)
        external
        view
        returns (bool)
    {
        bytes32 stored = _metadataHashes[tokenId];
        if (stored == bytes32(0)) revert TokenHasNoStoredHash();
        if (stored != claimedHash) revert MetadataHashMismatch();
        return true;
    }

    /**
     * @notice Devuelve el identificador de versión de esta implementación.
     * @return Cadena de versión semántica.
     */
    function version() external pure returns (string memory) {
        return "BASHOOD-RWA-2.0.0";
    }
}
