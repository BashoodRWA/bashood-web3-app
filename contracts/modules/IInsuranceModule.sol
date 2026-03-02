// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IInsuranceModule
 * @notice Interfaz del módulo externo de gestión de seguros del protocolo Bashood.
 *
 * ── RESPONSABILIDAD ÚNICA ───────────────────────────────────────────────────
 * Gestionar el ciclo de vida de la póliza de seguro activa de cada activo RWA:
 * registro, renovación, revocación y consulta de vigencia.
 *
 * ── RELACIÓN CON EL CORE ────────────────────────────────────────────────────
 * Este módulo es READ-ONLY respecto al Core (requiredRole = bytes32(0)).
 * · Lee el Core únicamente para validar que el tokenId existe (ownerOf).
 * · NO escribe en ningún mapping del Core.
 * · El storage autoritativo de la póliza vigente es este módulo.
 *
 * ── RELACIÓN CON Core.getInsuranceData() ────────────────────────────────────
 * Core._insuranceData (struct InsuranceData) contiene los datos de seguro
 * establecidos en el momento del mint (si se proporcionaron). Este módulo
 * gestiona el estado de la póliza ACTUAL y auditable tras el mint:
 *   · Core.getInsuranceData(tokenId) → datos iniciales de mint (inmutables)
 *   · IInsuranceModule.getPolicy(tokenId)  → estado vivo del seguro
 *
 * ── MODELO: UNA PÓLIZA ACTIVA POR TOKEN ─────────────────────────────────────
 * Cada token tiene como máximo una póliza activa en el módulo.
 * Registrar una nueva póliza sobreescribe la anterior (renovación implícita).
 * El campo `policyId` = keccak256(policyNumber) sirve de huella auditable.
 *
 * ── AUTORIZACIÓN INTERNA ────────────────────────────────────────────────────
 * El owner gestiona un whitelist de insurers autorizados.
 * El owner es insurer implícito.
 *
 * Plan M4 – Fase 3, Candidato 3.
 */
interface IInsuranceModule {

    // ── Struct ───────────────────────────────────────────────────────────────

    /**
     * @notice Registro de la póliza de seguro activa para un activo.
     * @param active          True si la póliza está vigente (no revocada).
     * @param policyId        keccak256(policyNumber) — huella auditable.
     * @param provider        Nombre del asegurador ("AXA", "FM Global"…).
     * @param coverageAmount  Importe de cobertura en USD, escalado 1e18.
     * @param annualPremium   Prima anual en USD, escalado 1e18.
     * @param issuedAt        Timestamp Unix del registro on-chain.
     * @param expiryDate      Timestamp Unix de vencimiento. 0 = sin vencimiento.
     * @param registeredBy    Dirección del insurer que registró la póliza.
     */
    struct PolicyRecord {
        bool    active;
        bytes32 policyId;
        string  provider;
        uint256 coverageAmount;
        uint256 annualPremium;
        uint32  issuedAt;
        uint32  expiryDate;
        address registeredBy;
    }

    // ── Eventos ──────────────────────────────────────────────────────────────

    /**
     * @notice Emitido cuando se registra o renueva la póliza de un activo.
     * @param tokenId         ID del activo asegurado.
     * @param policyId        keccak256(policyNumber).
     * @param provider        Nombre del asegurador.
     * @param coverageAmount  Importe de cobertura (1e18).
     * @param expiryDate      Timestamp de vencimiento (0 = sin vencimiento).
     */
    event PolicyRegistered(
        uint256 indexed tokenId,
        bytes32 indexed policyId,
        string  provider,
        uint256 coverageAmount,
        uint32  expiryDate
    );

    /**
     * @notice Emitido cuando se revoca la póliza activa de un activo.
     * @param tokenId    ID del activo.
     * @param policyId   keccak256 de la póliza revocada.
     * @param revokedBy  Dirección que ejecutó la revocación.
     */
    event PolicyRevoked(
        uint256 indexed tokenId,
        bytes32 indexed policyId,
        address revokedBy
    );

    /**
     * @notice Emitido al añadir una dirección al whitelist de insurers.
     */
    event InsurerGranted(address indexed account);

    /**
     * @notice Emitido al eliminar una dirección del whitelist de insurers.
     */
    event InsurerRevoked(address indexed account);

    // ── Gestión de insurers ───────────────────────────────────────────────────

    /**
     * @notice Añade una dirección al whitelist de insurers.
     * @dev Solo el owner puede llamar esta función.
     */
    function grantInsurer(address account) external;

    /**
     * @notice Elimina una dirección del whitelist de insurers.
     * @dev Solo el owner puede llamar esta función.
     */
    function revokeInsurer(address account) external;

    /**
     * @notice Consulta si una dirección puede registrar/revocar pólizas.
     * @return True si es insurer o es el owner.
     */
    function isInsurer(address account) external view returns (bool);

    // ── Escritura de pólizas ──────────────────────────────────────────────────

    /**
     * @notice Registra o renueva la póliza de un activo.
     * @dev Requiere que msg.sender sea insurer o owner.
     *      Revierte si el tokenId no existe en el Core.
     *      Una nueva póliza sobreescribe la anterior (renovación implícita).
     *      Si expiryDate > 0, debe ser una fecha futura.
     * @param tokenId         ID del activo NFT.
     * @param policyId        keccak256(policyNumber) — no puede ser bytes32(0).
     * @param provider        Nombre del asegurador (no puede ser vacío).
     * @param coverageAmount  Cobertura en USD (1e18). Debe ser > 0.
     * @param annualPremium   Prima anual en USD (1e18). Puede ser 0.
     * @param expiryDate      Timestamp de vencimiento. 0 = sin vencimiento.
     */
    function registerPolicy(
        uint256 tokenId,
        bytes32 policyId,
        string  calldata provider,
        uint256 coverageAmount,
        uint256 annualPremium,
        uint32  expiryDate
    ) external;

    /**
     * @notice Revoca la póliza activa de un activo.
     * @dev Requiere que msg.sender sea insurer o owner.
     *      Revierte si no hay póliza activa para el token.
     */
    function revokePolicy(uint256 tokenId) external;

    // ── Consulta ──────────────────────────────────────────────────────────────

    /**
     * @notice Devuelve el registro completo de la póliza activa.
     * @dev Si no hay póliza registrada, devuelve un PolicyRecord con
     *      active = false y campos en cero/vacío.
     */
    function getPolicy(uint256 tokenId) external view returns (PolicyRecord memory);

    /**
     * @notice True si hay póliza activa y no vencida para el token.
     * @return active == true && (expiryDate == 0 || expiryDate > block.timestamp)
     */
    function isInsured(uint256 tokenId) external view returns (bool);
}
