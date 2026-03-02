// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IInsuranceModule.sol";
import "./BashoodModuleBase.sol";

/**
 * @dev Minimal interface: solo validar existencia del tokenId vía ownerOf().
 */
interface ICoreForInsurance {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title InsuranceModule
 * @notice Tercer módulo externo del protocolo Bashood. Conforme al patrón
 *         oficial IBashoodModule / BashoodModuleBase.
 *         Responsabilidad única: gestionar el ciclo de vida de la póliza de
 *         seguro activa de cada activo RWA (registro, renovación, revocación).
 *
 * @dev READ-ONLY respecto al Core (requiredRole = bytes32(0)).
 *      Una póliza activa por token. Registrar sobreescribe (renovación implícita).
 *      El owner gestiona un whitelist de insurers con grantInsurer/revokeInsurer.
 *
 *      Relación con Core.getInsuranceData():
 *      · Core._insuranceData = datos de seguro del momento del mint (inmutables).
 *      · Este módulo = estado vivo de la póliza vigente (fuente autoritativa).
 *
 * Plan M4 – Fase 3, Candidato 3.
 */
contract InsuranceModule is IInsuranceModule, BashoodModuleBase {

    // ── Identificadores del módulo ────────────────────────────────────────
    bytes32 public constant MODULE_IDENTIFIER = keccak256("Insurance/1.0");
    string  public constant MODULE_VER        = "1.0.0";

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev tokenId → PolicyRecord (una póliza activa máximo por token)
    mapping(uint256 => PolicyRecord) private _policies;

    /// @dev Whitelist de insurers autorizados en el módulo.
    mapping(address => bool) private _insurers;

    // ── Constructor ───────────────────────────────────────────────────────

    /**
     * @param core_  Dirección del BashoodCore. Solo se usa para validar
     *               existencia del tokenId vía ownerOf().
     */
    constructor(address core_)
        BashoodModuleBase(
            core_,
            keccak256("Insurance/1.0"),
            "1.0.0",
            bytes32(0)          // read-only: no requiere rol en el Core
        )
    {}

    // ── Modificadores ────────────────────────────────────────────────────

    modifier onlyInsurer() {
        require(
            _insurers[msg.sender] || msg.sender == owner(),
            "InsuranceModule: not an insurer"
        );
        _;
    }

    // ── Gestión de insurers (onlyOwner) ──────────────────────────────────

    /// @inheritdoc IInsuranceModule
    function grantInsurer(address account) external onlyOwner {
        _requireNotZero(account, "InsuranceModule: zero insurer address");
        require(!_insurers[account], "InsuranceModule: already an insurer");
        _insurers[account] = true;
        emit InsurerGranted(account);
    }

    /// @inheritdoc IInsuranceModule
    function revokeInsurer(address account) external onlyOwner {
        require(_insurers[account], "InsuranceModule: not an insurer");
        _insurers[account] = false;
        emit InsurerRevoked(account);
    }

    /// @inheritdoc IInsuranceModule
    function isInsurer(address account) external view returns (bool) {
        return _insurers[account] || account == owner();
    }

    // ── Escritura de pólizas ─────────────────────────────────────────────

    /// @inheritdoc IInsuranceModule
    function registerPolicy(
        uint256 tokenId,
        bytes32 policyId,
        string calldata provider,
        uint256 coverageAmount,
        uint256 annualPremium,
        uint32  expiryDate
    ) external onlyInsurer {
        _requireValidToken(tokenId);
        require(policyId != bytes32(0),        "InsuranceModule: policyId is zero");
        require(bytes(provider).length > 0,    "InsuranceModule: provider is empty");
        require(coverageAmount > 0,            "InsuranceModule: coverage is zero");
        require(
            expiryDate == 0 || expiryDate > uint32(block.timestamp),
            "InsuranceModule: expiry in the past"
        );

        // Valida existencia del token en el Core.
        ICoreForInsurance(_coreAddress()).ownerOf(tokenId);

        _policies[tokenId] = PolicyRecord({
            active:         true,
            policyId:       policyId,
            provider:       provider,
            coverageAmount: coverageAmount,
            annualPremium:  annualPremium,
            issuedAt:       uint32(block.timestamp),
            expiryDate:     expiryDate,
            registeredBy:   msg.sender
        });

        emit PolicyRegistered(tokenId, policyId, provider, coverageAmount, expiryDate);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    /// @inheritdoc IInsuranceModule
    function revokePolicy(uint256 tokenId) external onlyInsurer {
        _requireValidToken(tokenId);
        require(_policies[tokenId].active, "InsuranceModule: no active policy");

        bytes32 pid = _policies[tokenId].policyId;
        _policies[tokenId].active = false;

        emit PolicyRevoked(tokenId, pid, msg.sender);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    // ── Consulta ─────────────────────────────────────────────────────────

    /// @inheritdoc IInsuranceModule
    function getPolicy(uint256 tokenId)
        external view returns (PolicyRecord memory)
    {
        return _policies[tokenId];
    }

    /// @inheritdoc IInsuranceModule
    function isInsured(uint256 tokenId) external view returns (bool) {
        PolicyRecord storage p = _policies[tokenId];
        if (!p.active) return false;
        if (p.expiryDate == 0) return true;
        return p.expiryDate > uint32(block.timestamp);
    }
}
