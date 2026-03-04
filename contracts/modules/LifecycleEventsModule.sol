// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../standards/IBashoodRWA.sol";
import "./BashoodModuleBase.sol";

/**
 * @dev Minimal Core interface para LifecycleEventsModule.
 *      Solo necesitamos validar existencia y leer el estado actual.
 */
interface ICoreForLifecycle {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title LifecycleEventsModule
 * @notice Módulo externo del protocolo Bashood. Conforme al patrón oficial
 *         IBashoodModule / BashoodModuleBase (Plan M4 – Fase 3).
 *
 * @dev Responsabilidad única: registrar el historial cronológico completo de
 *      transiciones de estado operativo de activos industriales RWA.
 *
 *      ARQUITECTURA
 *      ─────────────
 *      El Core almacena en OperationalMetrics únicamente el ESTADO ACTUAL
 *      (campo `status: OperationalStatus`). El histórico de transiciones
 *      se pierde con cada llamada a updateOperationalStatus().
 *
 *      Este módulo complementa al Core guardando cada transición como un
 *      evento append-only, construyendo la timeline completa del ciclo de
 *      vida del activo.
 *
 *      MODO READ-ONLY RESPECTO AL CORE
 *      ─────────────────────────────────
 *      · requiredRole = bytes32(0) → no requiere grantRole() en el Core.
 *      · Solo llama ownerOf() para validar existencia del token.
 *      · No escribe en el storage del Core en ningún caso.
 *
 *      FLUJO RECOMENDADO
 *      ──────────────────
 *      1. El ASSET_MANAGER llama Core.updateOperationalStatus(tokenId, newStatus).
 *      2. Inmediatamente después llama LifecycleEventsModule.logTransition(...).
 *      3. El historial completo de estados queda preservado en este módulo.
 *
 *      ESTADOS OPERATIVOS (OperationalStatus de IBashoodRWA)
 *      ────────────────────────────────────────────────────
 *      0 = OPERATIONAL
 *      1 = MAINTENANCE
 *      2 = INACTIVE
 *      3 = DECOMMISSIONED
 */
contract LifecycleEventsModule is BashoodModuleBase {

    // ── Identidad del módulo ──────────────────────────────────────────────

    bytes32 public constant MODULE_IDENTIFIER =
        keccak256("LifecycleEvents/1.0");
    string  public constant MODULE_VER = "1.0.0";

    // ── Tipos ─────────────────────────────────────────────────────────────

    /**
     * @notice Registro de una transición de estado del ciclo de vida.
     * @param timestamp   Marca de tiempo Unix de la transición.
     * @param operator    Cuenta que ejecutó el cambio de estado (msg.sender).
     * @param fromStatus  Estado anterior (IBashoodRWA.OperationalStatus).
     * @param toStatus    Estado nuevo (IBashoodRWA.OperationalStatus).
     * @param reason      Motivo del cambio (libre: "SCHEDULED_MAINTENANCE",
     *                    "END_OF_LIFE", "TRANSFERRED_NEW_OWNER", etc.).
     * @param docHash     Hash de documento de soporte (bytes32(0) si no aplica).
     */
    struct LifecycleEvent {
        uint32                        timestamp;
        address                       operator;
        IBashoodRWA.OperationalStatus fromStatus;
        IBashoodRWA.OperationalStatus toStatus;
        string                        reason;
        bytes32                       docHash;
    }

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev tokenId → historial cronológico de transiciones de estado (append-only).
    mapping(uint256 => LifecycleEvent[]) private _events;

    /// @dev Whitelist de operadores autorizados a registrar transiciones.
    mapping(address => bool) private _operators;

    // ── Eventos on-chain ──────────────────────────────────────────────────

    /**
     * @notice Emitido cuando se registra una transición de estado.
     * @param tokenId      ID del activo.
     * @param operator     Cuenta que ejecutó la transición.
     * @param fromStatus   Estado anterior.
     * @param toStatus     Estado nuevo.
     * @param recordIndex  Índice en el historial del token.
     */
    event LifecycleTransitionLogged(
        uint256 indexed tokenId,
        address indexed operator,
        IBashoodRWA.OperationalStatus fromStatus,
        IBashoodRWA.OperationalStatus toStatus,
        uint256                       recordIndex
    );

    /// @notice Emitido cuando se acredita un operador.
    event OperatorGranted(address indexed account);

    /// @notice Emitido cuando se revoca un operador.
    event OperatorRevoked(address indexed account);

    // ── Modificadores ────────────────────────────────────────────────────

    modifier onlyOperator() {
        require(
            _operators[msg.sender] || msg.sender == owner(),
            "LifecycleEvents: not an operator"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────

    /**
     * @param core_  Dirección del BashoodCore (BashoodRWAReference).
     */
    constructor(address core_)
        BashoodModuleBase(
            core_,
            keccak256("LifecycleEvents/1.0"),
            "1.0.0",
            bytes32(0)          // read-only: no requiere rol en el Core
        )
    {}

    // ── Gestión de operadores (onlyOwner) ────────────────────────────────

    /**
     * @notice Acredita a una cuenta para registrar transiciones.
     */
    function grantOperator(address account) external onlyOwner {
        _requireNotZero(account, "LifecycleEvents: zero address");
        require(!_operators[account], "LifecycleEvents: already operator");
        _operators[account] = true;
        emit OperatorGranted(account);
    }

    /**
     * @notice Revoca la autorización de un operador.
     */
    function revokeOperator(address account) external onlyOwner {
        require(_operators[account], "LifecycleEvents: not an operator");
        _operators[account] = false;
        emit OperatorRevoked(account);
    }

    /**
     * @notice Consulta si una cuenta es operador autorizado.
     */
    function isOperator(address account) external view returns (bool) {
        return _operators[account] || account == owner();
    }

    // ── Escritura de transiciones ─────────────────────────────────────────

    /**
     * @notice Registra una transición de estado operativo en el historial.
     *
     * @dev Validaciones:
     *      - fromStatus != toStatus (sin self-transitions).
     *      - DECOMMISSIONED es estado terminal: no permite toStatus diferente
     *        si fromStatus ya es DECOMMISSIONED.
     *      - Valida existencia del token en el Core mediante ownerOf().
     *
     *      El registro es append-only; no puede modificarse ni eliminarse.
     *      Llamar después de (o de forma paralela a) Core.updateOperationalStatus().
     *
     * @param tokenId     ID del activo.
     * @param fromStatus  Estado operativo anterior.
     * @param toStatus    Nuevo estado operativo.
     * @param reason      Descripción del motivo del cambio.
     * @param docHash     Hash de documento de soporte (bytes32(0) si no aplica).
     */
    function logTransition(
        uint256                       tokenId,
        IBashoodRWA.OperationalStatus fromStatus,
        IBashoodRWA.OperationalStatus toStatus,
        string calldata               reason,
        bytes32                       docHash
    ) external onlyOperator {
        _requireValidToken(tokenId);
        require(fromStatus != toStatus, "LifecycleEvents: no state change");
        require(
            fromStatus != IBashoodRWA.OperationalStatus.DECOMMISSIONED,
            "LifecycleEvents: asset is decommissioned"
        );

        // Valida existencia del token en el Core.
        ICoreForLifecycle(_coreAddress()).ownerOf(tokenId);

        _events[tokenId].push(LifecycleEvent({
            timestamp:  uint32(block.timestamp),
            operator:   msg.sender,
            fromStatus: fromStatus,
            toStatus:   toStatus,
            reason:     reason,
            docHash:    docHash
        }));

        uint256 idx = _events[tokenId].length - 1;

        emit LifecycleTransitionLogged(tokenId, msg.sender, fromStatus, toStatus, idx);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    // ── Lectura del historial ─────────────────────────────────────────────

    /**
     * @notice Devuelve un evento por índice.
     */
    function getLifecycleEvent(uint256 tokenId, uint256 index)
        external
        view
        returns (LifecycleEvent memory)
    {
        _requireValidToken(tokenId);
        require(
            index < _events[tokenId].length,
            "LifecycleEvents: index out of bounds"
        );
        return _events[tokenId][index];
    }

    /**
     * @notice Número total de transiciones registradas para un activo.
     */
    function getEventCount(uint256 tokenId)
        external
        view
        returns (uint256)
    {
        return _events[tokenId].length;
    }

    /**
     * @notice Devuelve el último evento registrado del activo.
     */
    function getLatestEvent(uint256 tokenId)
        external
        view
        returns (LifecycleEvent memory)
    {
        _requireValidToken(tokenId);
        uint256 len = _events[tokenId].length;
        require(len > 0, "LifecycleEvents: no events recorded");
        return _events[tokenId][len - 1];
    }

    /**
     * @notice Devuelve el historial completo de transiciones de un activo.
     * @dev    Para historiales largos usar paginación con getEvent(tokenId, index).
     */
    function getFullHistory(uint256 tokenId)
        external
        view
        returns (LifecycleEvent[] memory)
    {
        _requireValidToken(tokenId);
        return _events[tokenId];
    }

    /**
     * @notice Indica si el activo fue desactivado (DECOMMISSIONED) alguna vez.
     * @param tokenId ID del activo.
     * @return true si el historial contiene al menos una transición a DECOMMISSIONED.
     */
    function wasDecommissioned(uint256 tokenId)
        external
        view
        returns (bool)
    {
        uint256 len = _events[tokenId].length;
        for (uint256 i = 0; i < len; ) {
            if (_events[tokenId][i].toStatus ==
                    IBashoodRWA.OperationalStatus.DECOMMISSIONED)
            {
                return true;
            }
            unchecked { ++i; }
        }
        return false;
    }

    /**
     * @notice Cuenta el número de transiciones hacia un estado específico.
     * @param tokenId   ID del activo.
     * @param status    Estado a contar.
     * @return count    Número de transiciones que resultaron en ese estado.
     */
    function countTransitionsTo(
        uint256 tokenId,
        IBashoodRWA.OperationalStatus status
    ) external view returns (uint256 count) {
        uint256 len = _events[tokenId].length;
        for (uint256 i = 0; i < len; ) {
            if (_events[tokenId][i].toStatus == status) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }
    }
}
