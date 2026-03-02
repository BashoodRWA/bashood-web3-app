// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ICertificationModule.sol";
import "./BashoodModuleBase.sol";

/**
 * @dev Minimal interface: solo necesitamos validar que el tokenId existe.
 *      ownerOf() revierte con ERC721NonexistentToken si el token no está mintado.
 */
interface ICoreForCertification {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title CertificationModule
 * @notice Segundo módulo externo del protocolo Bashood. Conforme al patrón
 *         oficial IBashoodModule / BashoodModuleBase.
 *         Responsabilidad única: gestionar el ciclo de vida de certificaciones
 *         de compliance para activos RWA.
 *
 * @dev READ-ONLY respecto al Core (requiredRole = bytes32(0)).
 *      El módulo tiene su propio storage autoritativo de compliance vigente.
 *      El Core.getCertificationData() devuelve flags de elegibilidad del mint
 *      (estado inicial inmutable); este módulo gestiona el estado actual.
 *
 *      Autorización interna: el owner gestiona un whitelist de certifiers.
 *      El owner es certifier implícito. No requiere grantRole() en el Core.
 *
 * Plan M4 – Fase 3, Candidato 2.
 */
contract CertificationModule is ICertificationModule, BashoodModuleBase {

    // ── Identificadores del módulo ────────────────────────────────────────
    bytes32 public constant MODULE_IDENTIFIER = keccak256("Certification/1.0");
    string  public constant MODULE_VER        = "1.0.0";

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev tokenId → certType → CertRecord
    mapping(uint256 => mapping(bytes32 => CertRecord)) private _certs;

    /// @dev Whitelist de certifiers autorizados (en el módulo).
    mapping(address => bool) private _certifiers;

    // ── Constructor ───────────────────────────────────────────────────────

    /**
     * @param core_  Dirección del BashoodCore. Usada solo para validar
     *               existencia de tokenId vía ownerOf().
     */
    constructor(address core_)
        BashoodModuleBase(
            core_,
            keccak256("Certification/1.0"),
            "1.0.0",
            bytes32(0)          // read-only: no requiere rol en el Core
        )
    {}

    // ── Modificadores ────────────────────────────────────────────────────

    modifier onlyCertifier() {
        require(
            _certifiers[msg.sender] || msg.sender == owner(),
            "CertModule: not a certifier"
        );
        _;
    }

    // ── Gestión de certifiers (onlyOwner) ────────────────────────────────

    /// @inheritdoc ICertificationModule
    function grantCertifier(address account) external onlyOwner {
        _requireNotZero(account, "CertModule: zero certifier address");
        require(!_certifiers[account], "CertModule: already a certifier");
        _certifiers[account] = true;
        emit CertifierGranted(account);
    }

    /// @inheritdoc ICertificationModule
    function revokeCertifier(address account) external onlyOwner {
        require(_certifiers[account], "CertModule: not a certifier");
        _certifiers[account] = false;
        emit CertifierRevoked(account);
    }

    /// @inheritdoc ICertificationModule
    function isCertifier(address account) external view returns (bool) {
        return _certifiers[account] || account == owner();
    }

    // ── Escritura de certificaciones ──────────────────────────────────────

    /// @inheritdoc ICertificationModule
    function addCertification(
        uint256 tokenId,
        bytes32 certType,
        uint32  expiryDate,
        bytes32 docHash
    ) external onlyCertifier {
        _requireValidToken(tokenId);
        require(certType != bytes32(0), "CertModule: certType is zero");

        // Valida que el token existe en el Core (revierte si no mintado).
        ICoreForCertification(_coreAddress()).ownerOf(tokenId);

        // expiryDate == 0 es válido (sin vencimiento).
        // Si expiryDate > 0, debe ser futuro.
        require(
            expiryDate == 0 || expiryDate > uint32(block.timestamp),
            "CertModule: expiry in the past"
        );

        _certs[tokenId][certType] = CertRecord({
            active:     true,
            issuedAt:   uint32(block.timestamp),
            expiryDate: expiryDate,
            docHash:    docHash,
            issuer:     msg.sender
        });

        emit CertificationAdded(tokenId, certType, expiryDate, msg.sender);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    /// @inheritdoc ICertificationModule
    function revokeCertification(uint256 tokenId, bytes32 certType)
        external onlyCertifier
    {
        _requireValidToken(tokenId);
        require(_certs[tokenId][certType].active, "CertModule: cert not active");

        _certs[tokenId][certType].active = false;

        emit CertificationRevoked(tokenId, certType, msg.sender);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    // ── Consulta ──────────────────────────────────────────────────────────

    /// @inheritdoc ICertificationModule
    function getCertification(uint256 tokenId, bytes32 certType)
        external view returns (CertRecord memory)
    {
        return _certs[tokenId][certType];
    }

    /// @inheritdoc ICertificationModule
    function isActive(uint256 tokenId, bytes32 certType)
        external view returns (bool)
    {
        CertRecord storage r = _certs[tokenId][certType];
        if (!r.active) return false;
        if (r.expiryDate == 0) return true;
        return r.expiryDate > uint32(block.timestamp);
    }

    /// @inheritdoc ICertificationModule
    function isCompliant(uint256 tokenId, bytes32[] calldata required)
        external view returns (bool)
    {
        for (uint256 i = 0; i < required.length; i++) {
            CertRecord storage r = _certs[tokenId][required[i]];
            if (!r.active) return false;
            if (r.expiryDate != 0 && r.expiryDate <= uint32(block.timestamp)) {
                return false;
            }
        }
        return true;
    }
}
