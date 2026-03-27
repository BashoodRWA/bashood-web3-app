// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BashoodModuleBase.sol";

/**
 * @dev Minimal Core interface: validar existencia del token.
 */
interface ICoreForMaintenance {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title MaintenanceHistoryModule
 * @notice Módulo externo del protocolo Bashood. Conforme al patrón oficial
 *         IBashoodModule / BashoodModuleBase (Plan M4 – Fase 3).
 *
 * @dev Responsabilidad única: mantener el historial cronológico completo de
 *      eventos de mantenimiento de activos industriales RWA.
 *
 *      ARQUITECTURA
 *      ─────────────
 *      El Core almacena en OperationalMetrics únicamente el ÚLTIMO evento de
 *      mantenimiento (lastMaintenanceDate / nextMaintenanceDate). Los campos
 *      son sobreescritos en cada llamada a recordMaintenance().
 *
 *      Este módulo complementa al Core almacenando el historial completo:
 *      cada evento es appended sin sobreescritura. El resultado es un log
 *      append-only consultable total o por rango cronológico.
 *
 *      MODO READ-ONLY RESPECTO AL CORE
 *      ─────────────────────────────────
 *      · requiredRole = bytes32(0) → no requiere grantRole() en el Core.
 *      · Solo llama ownerOf() para validar existencia del token.
 *      · No escribe en el storage del Core en ningún caso.
 *
 *      FLUJO RECOMENDADO
 *      ──────────────────
 *      1. El ASSET_MANAGER llama Core.recordMaintenance(tokenId, ...).
 *      2. Inmediatamente después llama MaintenanceHistoryModule.logEvent(tokenId, ...).
 *      3. El historial queda preservado en este módulo indefinidamente.
 *
 *      Alternativamente, una empresa de mantenimiento acreditada puede
 *      llamar logEvent() directamente si el operador lo permite.
 *
 *      TIPOS DE MANTENIMIENTO
 *      ───────────────────────
 *      Valores recomendados (string libre, sin restricción on-chain):
 *        "PREVENTIVE"    — mantenimiento preventivo planificado
 *        "CORRECTIVE"    — reparación por fallo
 *        "MAJOR_OVERHAUL"— revisión general completa
 *        "INSPECTION"    — revisión sin intervención
 */
contract MaintenanceHistoryModule is BashoodModuleBase {

    // ── Identidad del módulo ──────────────────────────────────────────────

    bytes32 public constant MODULE_IDENTIFIER =
        keccak256("MaintenanceHistory/1.0");
    string  public constant MODULE_VER = "1.0.0";

    // ── Tipos ─────────────────────────────────────────────────────────────

    /**
     * @notice Registro individual de un evento de mantenimiento.
     * @param timestamp       Marca de tiempo Unix del mantenimiento.
     * @param maintenanceType Categoría libre: "PREVENTIVE", "CORRECTIVE", etc.
     * @param cost            Coste en USD (escalado 1e18). 0 si no disponible.
     * @param performedBy     Identificador de la empresa/técnico (dirección o
     *                        hash de identificador off-chain).
     * @param nextDate        Fecha estimada del próximo mantenimiento (Unix).
     *                        0 si no programado.
     * @param docHash         Hash del informe de servicio (IPFS o documental).
     * @param notes           Observaciones libres.
     */
    struct MaintenanceEvent {
        uint32  timestamp;
        string  maintenanceType;
        uint256 cost;
        address performedBy;
        uint32  nextDate;
        bytes32 docHash;
        string  notes;
    }

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev tokenId → historial cronológico de mantenimientos (append-only).
    mapping(uint256 => MaintenanceEvent[]) private _history;

    /**
     * @dev Whitelist de empresas de mantenimiento autorizadas POR TOKEN.
     *      _recorders[tokenId][account] = true si account puede registrar
     *      mantenimientos del activo tokenId.
     */
    mapping(uint256 => mapping(address => bool)) private _recorders;

    // ── Rate-limiting ────────────────────────────────────────────────────

    /// @notice Máximo de escrituras permitidas por una empresa en una época.
    ///         Configurable por el owner. El owner está exento.
    uint256 public maxWritesPerEpoch = 20;

    /// @notice Duración de una época en segundos para el rate-limiting.
    ///         Por defecto 1 hora. Configurable por el owner.
    uint256 public epochDuration = 1 hours;

    /// @dev company → número de época (block.timestamp / epochDuration) de su último write.
    mapping(address => uint256) private _epochStart;

    /// @dev company → número de writes en la época actual.
    mapping(address => uint256) private _epochCount;

    // ── Eventos ───────────────────────────────────────────────────────────

    /**
     * @notice Emitido cuando se registra un evento de mantenimiento.
     * @param tokenId         ID del activo.
     * @param performedBy     Cuenta que registró el mantenimiento.
     * @param maintenanceType Tipo de mantenimiento.
     * @param recordIndex     Índice en el historial del token.
     */
    event MaintenanceEventLogged(
        uint256 indexed tokenId,
        address indexed performedBy,
        string          maintenanceType,
        uint256         recordIndex
    );

    /// @notice Emitido cuando se acredita una empresa de mantenimiento.
    event RecorderGranted(address indexed account);

    /// @notice Emitido cuando se revoca una empresa de mantenimiento.
    event RecorderRevoked(address indexed account);

    /// @notice Emitido cuando el owner actualiza los parámetros de rate-limiting.
    event RateLimitUpdated(uint256 maxWritesPerEpoch, uint256 epochDuration);

    // ── Constructor ───────────────────────────────────────────────────────

    /**
     * @param core_  Dirección del BashoodCore (BashoodRWAReference).
     *               Usada para verificar existencia de tokenId via ownerOf().
     */
    constructor(address core_)
        BashoodModuleBase(
            core_,
            keccak256("MaintenanceHistory/1.0"),
            "1.0.0",
            bytes32(0)          // read-only: no requiere rol en el Core
        )
    {}

    // ── Gestión de recorders por token (onlyOwner) ─────────────────────────

    /**
     * @notice Acredita a una cuenta como recorder para un token específico.
     * @param tokenId ID del activo sobre el que se concede la autorización.
     * @param account Empresa de mantenimiento a acreditar.
     */
    function grantRecorder(uint256 tokenId, address account) external onlyOwner {
        _requireValidToken(tokenId);
        _requireNotZero(account, "MaintenanceHistory: zero address");
        require(!_recorders[tokenId][account], "MaintenanceHistory: already recorder");
        _recorders[tokenId][account] = true;
        emit RecorderGranted(account);
    }

    /**
     * @notice Revoca la autorización de un recorder para un token específico.
     * @param tokenId ID del activo para el que se revoca.
     * @param account Dirección a revocar.
     */
    function revokeRecorder(uint256 tokenId, address account) external onlyOwner {
        require(_recorders[tokenId][account], "MaintenanceHistory: not a recorder");
        _recorders[tokenId][account] = false;
        emit RecorderRevoked(account);
    }

    /**
     * @notice Consulta si una cuenta es recorder autorizado para un token concreto.
     * @param tokenId ID del activo.
     * @param account Dirección a consultar.
     * @return true si account puede registrar mantenimientos del activo tokenId.
     *         El owner devuelve siempre true (autorización implícita global).
     */
    function isRecorder(uint256 tokenId, address account) external view returns (bool) {
        return _recorders[tokenId][account] || account == owner();
    }

    // ── Configuración de rate-limiting (onlyOwner) ────────────────────────

    /**
     * @notice Actualiza los parámetros de rate-limiting.
     * @param maxWrites    Máximo de escrituras permitidas por empresa por época.
     * @param epochDur     Duración de la época en segundos (mín. 1).
     */
    function setRateLimit(uint256 maxWrites, uint256 epochDur) external onlyOwner {
        require(epochDur > 0, "MaintenanceHistory: epochDuration must be > 0");
        maxWritesPerEpoch = maxWrites;
        epochDuration     = epochDur;
        emit RateLimitUpdated(maxWrites, epochDur);
    }

    // ── Escritura de historial ────────────────────────────────────────────

    /**
     * @notice Registra un evento de mantenimiento en el historial cronológico.
     *
     * @dev El evento es append-only: no puede modificarse ni eliminarse.
     *      Valida existencia del token en el Core mediante ownerOf().
     *
     *      Llamar después de (o de forma paralela a) Core.recordMaintenance()
     *      para mantener sincronía entre el estado del Core y este historial.
     *
     * @param tokenId         ID del activo.
     * @param maintenanceType Tipo descriptivo ("PREVENTIVE", "CORRECTIVE", ...).
     * @param cost            Coste en USD escalado 1e18 (0 si no disponible).
     * @param nextDate        Fecha del próximo mantenimiento en Unix (0 = N/A).
     * @param docHash         Hash del informe (bytes32(0) si sin documento).
     * @param notes           Observaciones adicionales.
     */
    function logEvent(
        uint256         tokenId,
        string calldata maintenanceType,
        uint256         cost,
        uint32          nextDate,
        bytes32         docHash,
        string calldata notes
    ) external {
        _requireValidToken(tokenId);
        require(
            _recorders[tokenId][msg.sender] || msg.sender == owner(),
            "MaintenanceHistory: not a recorder"
        );
        require(bytes(maintenanceType).length > 0, "MaintenanceHistory: empty type");

        // Rate-limiting: solo aplica a recorders externos (el owner está exento).
        if (msg.sender != owner()) {
            uint256 epochBucket = block.timestamp / epochDuration;
            if (_epochStart[msg.sender] != epochBucket) {
                _epochStart[msg.sender] = epochBucket;
                _epochCount[msg.sender] = 0;
            }
            require(
                _epochCount[msg.sender] < maxWritesPerEpoch,
                "MaintenanceHistory: rate limit exceeded"
            );
            _epochCount[msg.sender]++;
        }

        // Valida existencia del token en el Core.
        ICoreForMaintenance(_coreAddress()).ownerOf(tokenId);

        _history[tokenId].push(MaintenanceEvent({
            timestamp:       uint32(block.timestamp),
            maintenanceType: maintenanceType,
            cost:            cost,
            performedBy:     msg.sender,
            nextDate:        nextDate,
            docHash:         docHash,
            notes:           notes
        }));

        uint256 idx = _history[tokenId].length - 1;

        emit MaintenanceEventLogged(tokenId, msg.sender, maintenanceType, idx);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    // ── Lectura de historial ──────────────────────────────────────────────

    /**
     * @notice Devuelve un evento de mantenimiento por índice.
     * @param tokenId ID del activo.
     * @param index   Índice 0-based en el historial.
     */
    function getMaintenanceEvent(uint256 tokenId, uint256 index)
        external
        view
        returns (MaintenanceEvent memory)
    {
        _requireValidToken(tokenId);
        require(
            index < _history[tokenId].length,
            "MaintenanceHistory: index out of bounds"
        );
        return _history[tokenId][index];
    }

    /**
     * @notice Devuelve el número total de eventos registrados para un activo.
     */
    function getEventCount(uint256 tokenId)
        external
        view
        returns (uint256)
    {
        return _history[tokenId].length;
    }

    /**
     * @notice Devuelve el último evento de mantenimiento del activo.
     */
    function getLatestEvent(uint256 tokenId)
        external
        view
        returns (MaintenanceEvent memory)
    {
        _requireValidToken(tokenId);
        uint256 len = _history[tokenId].length;
        require(len > 0, "MaintenanceHistory: no events recorded");
        return _history[tokenId][len - 1];
    }

    /**
     * @notice Devuelve el historial completo de un activo.
     * @dev    Para listas largas preferir paginación con getEvent(tokenId, index).
     */
    function getFullHistory(uint256 tokenId)
        external
        view
        returns (MaintenanceEvent[] memory)
    {
        _requireValidToken(tokenId);
        return _history[tokenId];
    }

    /**
     * @notice Devuelve el coste total acumulado de mantenimiento de un activo.
     * @param tokenId ID del activo.
     * @return totalCost Suma de todos los costes registrados (escalado 1e18).
     */
    function getTotalMaintenanceCost(uint256 tokenId)
        external
        view
        returns (uint256 totalCost)
    {
        uint256 len = _history[tokenId].length;
        for (uint256 i = 0; i < len; ) {
            totalCost += _history[tokenId][i].cost;
            unchecked { ++i; }
        }
    }
}
