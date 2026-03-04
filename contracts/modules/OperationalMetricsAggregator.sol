// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../standards/IBashoodRWA.sol";
import "./BashoodModuleBase.sol";

/**
 * @title OperationalMetricsAggregator
 * @notice Módulo externo del protocolo Bashood. Conforme al patrón oficial
 *         IBashoodModule / BashoodModuleBase (Plan M4 – Fase 3).
 *
 * @dev Responsabilidad única: agregar métricas operativas de múltiples activos
 *      (flotas/colecciones) sin duplicar el almacenamiento del Core.
 *
 *      ARQUITECTURA
 *      ─────────────
 *      · MODO COMPLETAMENTE READ-ONLY respecto al Core.
 *      · No tiene storage autoritativo de métricas — todos los datos se leen
 *        en tiempo real directamente desde el Core.
 *      · Mantiene únicamente registros de flotas (fleet): conjuntos de tokenIds
 *        definidos por el administrador para facilitar consultas cross-asset.
 *      · requiredRole = bytes32(0) → no requiere grantRole() en el Core.
 *
 *      FLOTAS (FLEETS)
 *      ────────────────
 *      Una flota es un conjunto de tokenIds relacionados (ej: "EVOCONS_FLEET",
 *      "SITE_A_EQUIPMENT"). El owner define las flotas y sus miembros.
 *      Cualquier cuenta puede consultar las métricas agregadas de una flota.
 *
 *      MÉTRICAS AGREGADAS DISPONIBLES
 *      ─────────────────────────────────
 *      - sumOperatingHours: total de horas operativas en la flota
 *      - sumTotalLoadLifted: toneladas totales movidas (EVOCONS)
 *      - sumMetersExtruded: metros totales extruidos (ICON)
 *      - countByStatus: número de activos en cada estado operativo
 *      - activeRatio: porcentaje de activos en estado ACTIVE
 */
contract OperationalMetricsAggregator is BashoodModuleBase {

    // ── Identidad del módulo ──────────────────────────────────────────────

    bytes32 public constant MODULE_IDENTIFIER =
        keccak256("OperationalMetricsAggregator/1.0");
    string  public constant MODULE_VER = "1.0.0";

    // ── Tipos ─────────────────────────────────────────────────────────────

    /**
     * @notice Resultado de una consulta de métricas agregadas de flota.
     * @param tokenCount         Número de activos en la flota consultada.
     * @param totalOperatingHours Suma total de horas operativas.
     * @param totalLoadLifted    Suma total de carga movida (EVOCONS, tons).
     * @param totalMetersExtruded Suma total de metros extruidos (ICON).
     * @param activeCount        Activos en estado OPERATIONAL.
     * @param maintenanceCount   Activos en estado MAINTENANCE.
     * @param inactiveCount      Activos en estado INACTIVE.
     * @param decommissionedCount Activos en estado DECOMMISSIONED.
     */
    struct FleetMetrics {
        uint256 tokenCount;
        uint256 totalOperatingHours;
        uint256 totalLoadLifted;
        uint256 totalMetersExtruded;
        uint256 activeCount;
        uint256 maintenanceCount;
        uint256 inactiveCount;
        uint256 decommissionedCount;
    }

    // ── Storage ───────────────────────────────────────────────────────────

    /// @dev fleetId → lista de tokenIds en la flota.
    mapping(bytes32 => uint256[]) private _fleets;

    /// @dev fleetId → nombre legible de la flota.
    mapping(bytes32 => string) private _fleetNames;

    /// @dev fleetId → existe.
    mapping(bytes32 => bool) private _fleetExists;

    /// @dev Lista de todas las flotas registradas.
    bytes32[] private _allFleets;

    // ── Eventos ───────────────────────────────────────────────────────────

    /// @notice Emitido cuando se crea una nueva flota.
    event FleetCreated(bytes32 indexed fleetId, string name);

    /// @notice Emitido cuando se añade un token a una flota.
    event TokenAddedToFleet(bytes32 indexed fleetId, uint256 indexed tokenId);

    /// @notice Emitido cuando se elimina un token de una flota.
    event TokenRemovedFromFleet(bytes32 indexed fleetId, uint256 indexed tokenId);

    // ── Constructor ───────────────────────────────────────────────────────

    /**
     * @param core_  Dirección del BashoodCore (BashoodRWAReference).
     */
    constructor(address core_)
        BashoodModuleBase(
            core_,
            keccak256("OperationalMetricsAggregator/1.0"),
            "1.0.0",
            bytes32(0)          // read-only: no requiere rol en el Core
        )
    {}

    // ── Gestión de flotas (onlyOwner) ─────────────────────────────────────

    /**
     * @notice Crea una nueva flota vacía.
     * @param fleetId   Identificador único de la flota.
     *                  Formato recomendado: keccak256("NOMBRE_FLOTA").
     * @param name      Nombre legible (ej: "EVOCONS_FLEET_SITE_A").
     */
    function createFleet(bytes32 fleetId, string calldata name)
        external
        onlyOwner
    {
        require(fleetId != bytes32(0), "Aggregator: zero fleetId");
        require(bytes(name).length > 0, "Aggregator: empty name");
        require(!_fleetExists[fleetId],  "Aggregator: fleet already exists");

        _fleetExists[fleetId] = true;
        _fleetNames[fleetId]  = name;
        _allFleets.push(fleetId);

        emit FleetCreated(fleetId, name);
    }

    /**
     * @notice Añade un tokenId a una flota existente.
     * @param fleetId  Identificador de la flota.
     * @param tokenId  ID del activo a incorporar.
     */
    function addToFleet(bytes32 fleetId, uint256 tokenId)
        external
        onlyOwner
    {
        require(_fleetExists[fleetId],  "Aggregator: fleet not found");
        _requireValidToken(tokenId);

        // Verifica existencia del token en el Core.
        ICoreForAggregator(_coreAddress()).ownerOf(tokenId);

        // Verifica que no está ya en la flota.
        uint256 len = _fleets[fleetId].length;
        for (uint256 i = 0; i < len; ) {
            require(
                _fleets[fleetId][i] != tokenId,
                "Aggregator: token already in fleet"
            );
            unchecked { ++i; }
        }

        _fleets[fleetId].push(tokenId);
        emit TokenAddedToFleet(fleetId, tokenId);
        emit ModuleOperationExecuted(tokenId, msg.sender);
    }

    /**
     * @notice Elimina un tokenId de una flota.
     * @dev Usa swap-and-pop para O(1) eliminación.
     */
    function removeFromFleet(bytes32 fleetId, uint256 tokenId)
        external
        onlyOwner
    {
        require(_fleetExists[fleetId], "Aggregator: fleet not found");

        uint256[] storage members = _fleets[fleetId];
        uint256 len = members.length;
        for (uint256 i = 0; i < len; ) {
            if (members[i] == tokenId) {
                members[i] = members[len - 1];
                members.pop();
                emit TokenRemovedFromFleet(fleetId, tokenId);
                return;
            }
            unchecked { ++i; }
        }
        revert("Aggregator: token not in fleet");
    }

    // ── Lectura de flotas ─────────────────────────────────────────────────

    /**
     * @notice Devuelve los tokenIds de una flota.
     */
    function getFleetMembers(bytes32 fleetId)
        external
        view
        returns (uint256[] memory)
    {
        require(_fleetExists[fleetId], "Aggregator: fleet not found");
        return _fleets[fleetId];
    }

    /**
     * @notice Devuelve el nombre legible de una flota.
     */
    function getFleetName(bytes32 fleetId)
        external
        view
        returns (string memory)
    {
        require(_fleetExists[fleetId], "Aggregator: fleet not found");
        return _fleetNames[fleetId];
    }

    /**
     * @notice Lista todas las flotas registradas.
     */
    function getAllFleets() external view returns (bytes32[] memory) {
        return _allFleets;
    }

    // ── Agregación cross-asset ────────────────────────────────────────────

    /**
     * @notice Agrega métricas operativas de todos los activos de una flota.
     *
     * @dev Lee el storage del Core en tiempo real — no duplica métricas.
     *      Complejidad: O(n) donde n = número de tokens en la flota.
     *      Para flotas grandes (>50 tokens) considerar llamadas paginadas
     *      con aggregateTokens(tokenIds[]).
     *
     * @param fleetId  Identificador de la flota.
     * @return metrics Métricas agregadas de la flota.
     */
    function aggregateFleet(bytes32 fleetId)
        external
        view
        returns (FleetMetrics memory metrics)
    {
        require(_fleetExists[fleetId], "Aggregator: fleet not found");
        // Copiar storage[] a memory[] para pasar a la función interna.
        uint256[] memory ids = _fleets[fleetId];
        return _aggregate(ids);
    }

    /**
     * @notice Agrega métricas operativas de una lista arbitraria de tokenIds.
     *
     * @dev Permite consultas ad-hoc sin necesidad de definir una flota.
     *      Los tokenIds deben existir en el Core (revierte si alguno no existe).
     *
     * @param tokenIds Array de tokenIds a agregar.
     * @return metrics Métricas agregadas.
     */
    function aggregateTokens(uint256[] calldata tokenIds)
        external
        view
        returns (FleetMetrics memory metrics)
    {
        return _aggregate(tokenIds);
    }

    /**
     * @notice Devuelve las métricas operativas raw del Core para un token.
     * @param tokenId ID del activo.
     */
    function getRawMetrics(uint256 tokenId)
        external
        view
        returns (IBashoodRWA.OperationalMetrics memory)
    {
        _requireValidToken(tokenId);
        return ICoreForAggregator(_coreAddress()).getOperationalMetrics(tokenId);
    }

    /**
     * @notice Calcula el porcentaje de activos ACTIVE en una flota (0–100).
     * @param fleetId ID de la flota.
     * @return pct Porcentaje 0–100. 0 si la flota está vacía.
     */
    function activeRatio(bytes32 fleetId)
        external
        view
        returns (uint256 pct)
    {
        require(_fleetExists[fleetId], "Aggregator: fleet not found");
        uint256 len = _fleets[fleetId].length;
        if (len == 0) return 0;

        uint256[] memory ids = _fleets[fleetId];
        FleetMetrics memory m = _aggregate(ids);
        return (m.activeCount * 100) / len;
    }

    // ── Lógica interna de agregación ──────────────────────────────────────

    /**
     * @dev Función interna única para agregar métricas.
     *      Recibe uint256[] memory para compatibilidad con storage[] y calldata[].
     *      aggregateFleet() copia el storage array a memory antes de llamar.
     *      aggregateTokens() recibe calldata y Solidity lo convierte implícitamente.
     */
    function _aggregate(uint256[] memory tokenIds)
        internal
        view
        returns (FleetMetrics memory m)
    {
        uint256 len = tokenIds.length;
        m.tokenCount = len;
        ICoreForAggregator core = ICoreForAggregator(_coreAddress());

        for (uint256 i = 0; i < len; ) {
            IBashoodRWA.OperationalMetrics memory om =
                core.getOperationalMetrics(tokenIds[i]);

            m.totalOperatingHours += om.operatingHours;
            m.totalLoadLifted     += om.totalLoadLifted;
            m.totalMetersExtruded += om.metersExtruded;

            if (om.status == IBashoodRWA.OperationalStatus.OPERATIONAL) {
                unchecked { ++m.activeCount; }
            } else if (om.status == IBashoodRWA.OperationalStatus.MAINTENANCE) {
                unchecked { ++m.maintenanceCount; }
            } else if (om.status == IBashoodRWA.OperationalStatus.INACTIVE) {
                unchecked { ++m.inactiveCount; }
            } else if (om.status == IBashoodRWA.OperationalStatus.DECOMMISSIONED) {
                unchecked { ++m.decommissionedCount; }
            }

            unchecked { ++i; }
        }
    }
}
