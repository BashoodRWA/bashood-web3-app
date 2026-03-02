// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICertificationModule
 * @notice Interfaz del módulo externo de certificaciones del protocolo Bashood.
 *
 * ── RESPONSABILIDAD ÚNICA ───────────────────────────────────────────────────
 * Gestionar el ciclo de vida de las certificaciones de compliance de activos
 * RWA (adición, revocación, consulta y verificación de vigencia).
 *
 * ── RELACIÓN CON EL CORE ────────────────────────────────────────────────────
 * Este módulo es READ-ONLY respecto al Core (requiredRole = bytes32(0)).
 * · Lee el Core únicamente para validar que el tokenId existe (ownerOf).
 * · NO escribe en ningún mapping del Core.
 * · El storage autoritativo de compliance vigente es este módulo.
 *
 * ── RELACIÓN CON Core.getCertificationData() ────────────────────────────────
 * Core._certificationData (struct CertificationData con booleans) contiene
 * los flags de elegibilidad establecidos en el momento del mint del activo.
 * Este módulo es la fuente de verdad del estado de compliance ACTUAL y
 * auditable tras el mint. Ambas fuentes son complementarias, no redundantes:
 *   · Core.getCertificationData(tokenId) → elegibilidad inicial (inmutable)
 *   · ICertificationModule.getCertification(tokenId, certType) → estado vivo
 *
 * ── AUTORIZACIÓN INTERNA ────────────────────────────────────────────────────
 * El módulo gestiona su propio whitelist de certifiers:
 *   · El owner (deployer/admin) puede añadir/revocar certifiers.
 *   · El owner es implícitamente certifier.
 *   · Los certifiers pueden añadir y revocar certificaciones.
 *
 * ── TIPOS DE CERTIFICACIÓN ──────────────────────────────────────────────────
 * certType se representa como bytes32 = keccak256 del nombre canónico.
 * Constantes recomendadas en tooling off-chain:
 *   CE_MARK     = keccak256("CE_MARK")
 *   ISO_9001    = keccak256("ISO_9001")
 *   ISO_14001   = keccak256("ISO_14001")
 *   UL_3401     = keccak256("UL_3401")
 *   IBC         = keccak256("IBC_COMPLIANT")
 *   OSHA        = keccak256("OSHA_COMPLIANT")
 *
 * Plan M4 – Fase 3, Candidato 2.
 */
interface ICertificationModule {

    // ── Struct ───────────────────────────────────────────────────────────────

    /**
     * @notice Registro de una certificación individual para un activo.
     * @param active      True si la certificación está vigente (no revocada).
     * @param issuedAt    Timestamp Unix del momento de emisión on-chain.
     * @param expiryDate  Timestamp Unix de expiración. 0 = sin vencimiento.
     * @param docHash     Hash del documento de respaldo (IPFS CIDv0 o SHA-256).
     * @param issuer      Dirección del certifier que añadió esta entrada.
     */
    struct CertRecord {
        bool    active;
        uint32  issuedAt;
        uint32  expiryDate;
        bytes32 docHash;
        address issuer;
    }

    // ── Eventos ──────────────────────────────────────────────────────────────

    /**
     * @notice Emitido cuando se añade o renueva una certificación.
     * @param tokenId   ID del activo certificado.
     * @param certType  bytes32 del tipo de certificación.
     * @param expiryDate Timestamp de expiración (0 = sin vencimiento).
     * @param issuer    Dirección del certifier que emitió la certificación.
     */
    event CertificationAdded(
        uint256 indexed tokenId,
        bytes32 indexed certType,
        uint32  expiryDate,
        address indexed issuer
    );

    /**
     * @notice Emitido cuando se revoca una certificación.
     * @param tokenId    ID del activo.
     * @param certType   bytes32 del tipo de certificación.
     * @param revokedBy  Dirección que ejecutó la revocación.
     */
    event CertificationRevoked(
        uint256 indexed tokenId,
        bytes32 indexed certType,
        address revokedBy
    );

    /**
     * @notice Emitido cuando se añade una dirección al whitelist de certifiers.
     */
    event CertifierGranted(address indexed account);

    /**
     * @notice Emitido cuando se elimina una dirección del whitelist de certifiers.
     */
    event CertifierRevoked(address indexed account);

    // ── Gestión de certifiers ────────────────────────────────────────────────

    /**
     * @notice Añade una dirección al whitelist de certifiers.
     * @dev Solo el owner puede llamar esta función.
     * @param account  Dirección a autorizar.
     */
    function grantCertifier(address account) external;

    /**
     * @notice Elimina una dirección del whitelist de certifiers.
     * @dev Solo el owner puede llamar esta función.
     * @param account  Dirección a desautorizar.
     */
    function revokeCertifier(address account) external;

    /**
     * @notice Consulta si una dirección puede añadir/revocar certificaciones.
     * @param account  Dirección a consultar.
     * @return True si es certifier o es el owner.
     */
    function isCertifier(address account) external view returns (bool);

    // ── Escritura de certificaciones ─────────────────────────────────────────

    /**
     * @notice Registra o renueva una certificación para un activo.
     * @dev Requiere que el llamante sea certifier o owner.
     *      Revierte si el tokenId no existe en el Core.
     *      Si ya existía una certificación del mismo tipo, la sobreescribe
     *      (renovación sin necesidad de revocar antes).
     * @param tokenId     ID del activo NFT.
     * @param certType    bytes32 del tipo de certificación.
     * @param expiryDate  Timestamp de expiración. Pasar 0 para sin vencimiento.
     * @param docHash     Hash del documento de respaldo off-chain.
     */
    function addCertification(
        uint256 tokenId,
        bytes32 certType,
        uint32  expiryDate,
        bytes32 docHash
    ) external;

    /**
     * @notice Revoca una certificación activa.
     * @dev Requiere que el llamante sea certifier o owner.
     *      Revierte si la certificación no está activa.
     * @param tokenId   ID del activo NFT.
     * @param certType  bytes32 del tipo de certificación.
     */
    function revokeCertification(uint256 tokenId, bytes32 certType) external;

    // ── Consulta ─────────────────────────────────────────────────────────────

    /**
     * @notice Devuelve el registro completo de una certificación.
     * @param tokenId   ID del activo NFT.
     * @param certType  bytes32 del tipo de certificación.
     * @return record   Struct CertRecord con el estado actual.
     */
    function getCertification(uint256 tokenId, bytes32 certType)
        external view returns (CertRecord memory record);

    /**
     * @notice Comprueba si una certificación está activa y no expirada.
     * @param tokenId   ID del activo NFT.
     * @param certType  bytes32 del tipo de certificación.
     * @return True si active == true y (expiryDate == 0 || expiryDate > block.timestamp).
     */
    function isActive(uint256 tokenId, bytes32 certType)
        external view returns (bool);

    /**
     * @notice Verifica que todas las certificaciones requeridas están activas y vigentes.
     * @dev Devuelve false en cuanto encuentra una que no cumple (no itera todas).
     * @param tokenId   ID del activo NFT.
     * @param required  Array de bytes32 con los tipos de certificación requeridos.
     * @return compliant True si todas las certificaciones del array están activas.
     */
    function isCompliant(uint256 tokenId, bytes32[] calldata required)
        external view returns (bool compliant);
}
