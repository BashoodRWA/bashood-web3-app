// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BashoodModuleBase.sol";

/**
 * @dev Minimal Core interface: validar existencia del token.
 *      ownerOf() revierte con ERC721NonexistentToken si no está mintado.
 */
interface ICoreForInspection {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title InspectionModule
 * @notice Módulo externo del protocolo Bashood. Conforme al patrón oficial
 *         IBashoodModule / BashoodModuleBase (Plan M4 – Fase 3).
 *
 * @dev Responsabilidad única: registrar el historial cronológico de
 *      inspecciones técnicas de activos industriales RWA.
 *
 *      ARQUITECTURA
 *      ─────────────
 *      · El Core almacena el ESTADO ACTUAL del activo (OperationalMetrics).
 *      · Este módulo almacena el HISTORIAL de inspecciones (append-only).
 *      · No escribe en el Core — solo lee ownerOf() para validar tokenId.
 *      · requiredRole = ASSET_MANAGER_ROLE (declarado, sin llamadas write al Core).
 *
 *      AUTORIZACIÓN INTERNA
 *      ─────────────────────
 *      · El owner gestiona una whitelist de inspectores acreditados.
 *      · El owner es inspector implícito.
 *      · Cada inspección queda ligada al inspector que la ejecutó (msg.sender).
 *
 *      TIPOS DE RESULTADO
 *      ───────────────────
 *      0 = PASS
 *      1 = FAIL
 *      2 = CONDITIONAL (requiere acción correctiva)
 */
contract InspectionModule is BashoodModuleBase {

    // ── Identidad del módulo ──────────────────────────────────────────────

    bytes32 public constant MODULE_IDENTIFIER =
        keccak256("Inspection/1.0");
    string  public constant MODULE_VER = "1.0.0";

    /// @notice Rol del Core que el módulo declara necesitar.
    bytes32 public constant ASSET_MANAGER_ROLE =
        keccak256("ASSET_MANAGER_ROLE");

    // ── Tipos ─────────────────────────────────────────────────────────────

    /**
     * @notice Resultado de una inspección técnica.
     * @param timestamp       Marca de tiempo Unix de la inspección.
     * @param inspector       Dirección del inspector que la ejecutó.
     * @param inspectionType  Identificador del tipo: "VISUAL", "STRUCTURAL",
     *                        "ELECTRICAL", "LOAD_TEST", "FULL", etc.
     * @param result          0=PASS | 1=FAIL | 2=CONDITIONAL.
     * @param docHash         Hash del informe (IPFS CID o hash documental).
     * @param notes           Observaciones libres.
     */
    struct InspectionRecord {
        uint32  timestamp;
        address inspector;
        bytes32 inspectionType;
        uint8   result;
        bytes32 docHash;
        string  notes;
    }

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev tokenId → historial cronológico de inspecciones (append-only).
    mapping(uint256 => InspectionRecord[]) private _inspections;

    /**
     * @dev Whitelist de inspectores acreditados POR TOKEN.
     *      _inspectors[tokenId][account] = true si account puede inspeccionar
     *      el activo tokenId.
     */
    mapping(uint256 => mapping(address => bool)) private _inspectors;

    // ── Rate-limiting ────────────────────────────────────────────────────

    /// @notice Máximo de inspecciones permitidas por empresa en una época.
    ///         Configurable por el owner. El owner está exento.
    uint256 public maxWritesPerEpoch = 20;

    /// @notice Duración de una época en segundos para el rate-limiting.
    ///         Por defecto 1 hora. Configurable por el owner.
    uint256 public epochDuration = 1 hours;

    /// @dev inspector → número de época de su último write.
    mapping(address => uint256) private _epochStart;

    /// @dev inspector → número de writes en la época actual.
    mapping(address => uint256) private _epochCount;

    // ── Eventos ───────────────────────────────────────────────────────────

    /**
     * @notice Emitido cuando se registra una nueva inspección.
     * @param tokenId        ID del activo inspeccionado.
     * @param inspector      Cuenta que realizó la inspección.
     * @param inspectionType Tipo de inspección.
     * @param result         0=PASS | 1=FAIL | 2=CONDITIONAL.
     * @param recordIndex    Índice en el array de inspecciones del token.
     */
    event InspectionRecorded(
        uint256 indexed tokenId,
        address indexed inspector,
        bytes32         inspectionType,
        uint8           result,
        uint256         recordIndex
    );

    /// @notice Emitido cuando se acredita un inspector.
    event InspectorGranted(address indexed account);

    /// @notice Emitido cuando se revoca un inspector.
    event InspectorRevoked(address indexed account);

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
            keccak256("Inspection/1.0"),
            "1.0.0",
            keccak256("ASSET_MANAGER_ROLE")   // rol declarado, no usado en write
        )
    {}

    // ── Gestión de inspectores por token (onlyOwner) ──────────────────────

    /**
     * @notice Acredita a una cuenta como inspector para un token específico.
     * @param tokenId ID del activo sobre el que se concede la autorización.
     * @param account Dirección del inspector a acreditar.
     */
    function grantInspector(uint256 tokenId, address account) external onlyOwner {
        _requireValidToken(tokenId);
        _requireNotZero(account, "InspectionModule: zero address");
        require(!_inspectors[tokenId][account], "InspectionModule: already inspector");
        _inspectors[tokenId][account] = true;
        emit InspectorGranted(account);
    }

    /**
     * @notice Revoca la acreditación de un inspector para un token específico.
     * @param tokenId ID del activo para el que se revoca.
     * @param account Dirección del inspector a revocar.
     */
    function revokeInspector(uint256 tokenId, address account) external onlyOwner {
        require(_inspectors[tokenId][account], "InspectionModule: not an inspector");
        _inspectors[tokenId][account] = false;
        emit InspectorRevoked(account);
    }

    /**
     * @notice Consulta si una cuenta es inspector acreditado para un token concreto.
     * @param tokenId ID del activo.
     * @param account Dirección a consultar.
     * @return true si account puede inspeccionar el activo tokenId.
     *         El owner devuelve siempre true (autorización implícita global).
     */
    function isInspector(uint256 tokenId, address account) external view returns (bool) {
        return _inspectors[tokenId][account] || account == owner();
    }

    // ── Configuración de rate-limiting (onlyOwner) ────────────────────────

    /**
     * @notice Actualiza los parámetros de rate-limiting.
     * @param maxWrites    Máximo de inspecciones permitidas por empresa por época.
     * @param epochDur     Duración de la época en segundos (mín. 1).
     */
    function setRateLimit(uint256 maxWrites, uint256 epochDur) external onlyOwner {
        require(epochDur > 0, "InspectionModule: epochDuration must be > 0");
        maxWritesPerEpoch = maxWrites;
        epochDuration     = epochDur;
        emit RateLimitUpdated(maxWrites, epochDur);
    }

    // ── Escritura de inspecciones ────────────────────────────────────────

    /**
     * @notice Registra una nueva inspección técnica para un activo.
     *
     * @dev Valida que el tokenId existe en el Core mediante ownerOf().
     *      El registro es append-only; no puede modificarse ni eliminarse.
     *
     * @param tokenId        ID del activo (debe existir en el Core).
     * @param inspectionType Tipo de inspección. Ej: keccak256("VISUAL").
     * @param result         0=PASS | 1=FAIL | 2=CONDITIONAL.
     * @param docHash        Hash del archivo de informe (puede ser bytes32(0)
     *                       si todavía no hay documento).
     * @param notes          Observaciones del inspector (puede estar vacío).
     */
    function recordInspection(
        uint256         tokenId,
        bytes32         inspectionType,
        uint8           result,
        bytes32         docHash,
        string calldata notes
    ) external {
        _requireValidToken(tokenId);
        require(
            _inspectors[tokenId][msg.sender] || msg.sender == owner(),
            "InspectionModule: not an inspector"
        );
        require(inspectionType != bytes32(0), "InspectionModule: empty type");
        require(result <= 2,                  "InspectionModule: invalid result");

        // Rate-limiting: solo aplica a inspectores externos (el owner está exento).
        if (msg.sender != owner()) {
            uint256 epochBucket = block.timestamp / epochDuration;
            if (_epochStart[msg.sender] != epochBucket) {
                _epochStart[msg.sender] = epochBucket;
                _epochCount[msg.sender] = 0;
            }
            require(
                _epochCount[msg.sender] < maxWritesPerEpoch,
                "InspectionModule: rate limit exceeded"
            );
            _epochCount[msg.sender]++;
        }

        // Valida existencia del token en el Core (revierte si no existe).
        ICoreForInspection(_coreAddress()).ownerOf(tokenId);

        _inspections[tokenId].push(InspectionRecord({
            timestamp:      uint32(block.timestamp),
            inspector:      msg.sender,
            inspectionType: inspectionType,
            result:         result,
            docHash:        docHash,
            notes:          notes
        }));

        uint256 idx = _inspections[tokenId].length - 1;

        emit InspectionRecorded(tokenId, msg.sender, inspectionType, result, idx);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    // ── Lectura de historial ──────────────────────────────────────────────

    /**
     * @notice Devuelve una inspección específica por índice.
     * @param tokenId ID del activo.
     * @param index   Índice en el array de historial (0-based).
     */
    function getInspection(uint256 tokenId, uint256 index)
        external
        view
        returns (InspectionRecord memory)
    {
        _requireValidToken(tokenId);
        require(
            index < _inspections[tokenId].length,
            "InspectionModule: index out of bounds"
        );
        return _inspections[tokenId][index];
    }

    /**
     * @notice Devuelve el número total de inspecciones registradas para un activo.
     * @param tokenId ID del activo.
     */
    function getInspectionCount(uint256 tokenId)
        external
        view
        returns (uint256)
    {
        return _inspections[tokenId].length;
    }

    /**
     * @notice Devuelve la inspección más reciente del activo.
     * @param tokenId ID del activo.
     */
    function getLatestInspection(uint256 tokenId)
        external
        view
        returns (InspectionRecord memory)
    {
        _requireValidToken(tokenId);
        uint256 len = _inspections[tokenId].length;
        require(len > 0, "InspectionModule: no inspections recorded");
        return _inspections[tokenId][len - 1];
    }

    /**
     * @notice Indica si la última inspección del activo fue aprobada (PASS).
     * @param tokenId ID del activo.
     * @return true si la última inspección tiene result == 0 (PASS).
     *         false si no hay inspecciones o la última fue FAIL/CONDITIONAL.
     */
    function passedLatestInspection(uint256 tokenId)
        external
        view
        returns (bool)
    {
        uint256 len = _inspections[tokenId].length;
        if (len == 0) return false;
        return _inspections[tokenId][len - 1].result == 0;
    }

    /**
     * @notice Devuelve el historial completo de inspecciones de un activo.
     * @dev    Usar con precaución en mainnet; para listas largas usar
     *         paginación con getInspection(tokenId, index).
     * @param tokenId ID del activo.
     */
    function getAllInspections(uint256 tokenId)
        external
        view
        returns (InspectionRecord[] memory)
    {
        _requireValidToken(tokenId);
        return _inspections[tokenId];
    }
}
