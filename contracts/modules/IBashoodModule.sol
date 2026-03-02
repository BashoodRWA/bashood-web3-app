// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBashoodModule
 * @notice Interfaz base obligatoria para todos los módulos externos del protocolo Bashood.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * PATRÓN OFICIAL DE MÓDULOS – BASHOOD PROTOCOL (Plan M4)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * INTEGRACIÓN
 * ───────────
 * 1. El módulo se despliega de forma independiente al Core.
 * 2. El admin llama a `Core.grantRole(ROLE, moduleAddress)` para autorizarlo.
 * 3. El módulo llama funciones públicas del Core usando el rol otorgado.
 * 4. El Core NO conoce la dirección del módulo. No hay acoplamiento inverso.
 *
 * PERMISOS
 * ────────
 * · Los módulos operan estrictamente con roles estándar del Core (OpenZeppelin
 *   AccessControl). Nunca reciben DEFAULT_ADMIN_ROLE.
 * · Un módulo puede tener como máximo UN rol primario en el Core.
 * · El admin puede revocar el rol en cualquier momento para desactivar el módulo.
 *
 * EVENTOS
 * ───────
 * · Los módulos emiten sus propios eventos de nivel de módulo.
 * · Nunca duplican eventos que ya emite el Core.
 * · Todos los eventos de módulo DEBEN incluir `tokenId` como primer argumento
 *   indexado cuando la operación es por activo.
 *
 * RESTRICCIONES ABSOLUTAS
 * ───────────────────────
 * · Un módulo NUNCA puede modificar su propio almacenamiento de activos.
 *   El único storage autoritativo es el Core.
 * · Un módulo NUNCA puede llamar `grantRole` ni `revokeRole` en el Core.
 * · Un módulo NUNCA puede inicializar ni actualizar el Core (sin UPGRADER_ROLE).
 * · Un módulo NUNCA puede bloquear (revert) el Core ante entradas arbitrarias;
 *   toda validación de parámetros se realiza en el módulo antes de llamar al Core.
 * · Un módulo NUNCA interactúa con otro módulo directamente; toda comunicación
 *   pasa por el Core como fuente de verdad.
 *
 * TESTING
 * ───────
 * · Cada módulo tiene su propio archivo de tests en `test/modules/`.
 * · Los tests cubren: happy path, validaciones de entrada, integración por rol,
 *   revocación de rol, y escenario end-to-end.
 * · Se verifica que el Core permanece inalterado en tamaño tras añadir el módulo.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
interface IBashoodModule {

    // ── Eventos obligatorios ─────────────────────────────────────────────────

    /**
     * @notice Emitido cuando el módulo procesa correctamente una operación
     *         sobre un activo específico.
     * @param tokenId   ID del activo afectado.
     * @param operator  Dirección que inició la llamada.
     */
    event ModuleOperationExecuted(uint256 indexed tokenId, address indexed operator);

    /**
     * @notice Emitido cuando la dirección del Core asociado es consultada.
     *         Útil para indexadores y herramientas de monitoreo off-chain.
     * @dev No es obligatorio emitirlo en cada llamada; se recomienda en el
     *      constructor del módulo o en operaciones de configuración.
     */
    event CoreBound(address indexed core);

    // ── Funciones de identidad ───────────────────────────────────────────────

    /**
     * @notice Dirección inmutable del contrato Core al que está vinculado este módulo.
     * @return core_ Dirección del BashoodCore.
     */
    function coreContract() external view returns (address core_);

    /**
     * @notice Identificador único e inmutable del módulo dentro del protocolo.
     * @dev Formato: bytes32 hash de la cadena "<NombreModulo>/<versión>".
     *      Ejemplo: keccak256("OracleValuation/1.0")
     * @return moduleId_ Identificador del módulo.
     */
    function moduleId() external view returns (bytes32 moduleId_);

    /**
     * @notice Versión semántica del módulo en formato legible.
     * @return version_ Cadena de versión (ej. "1.0.0").
     */
    function moduleVersion() external view returns (string memory version_);

    /**
     * @notice Rol del Core que este módulo requiere para operar.
     * @dev El admin debe hacer `Core.grantRole(requiredRole(), moduleAddress)`
     *      si y solo si este valor es distinto de bytes32(0).
     *
     *   SENTINEL: bytes32(0) → módulo read-only. No requiere rol en el Core.
     *             Puede leer estado y emitir eventos, pero no escribe storage.
     *
     * @return role_ bytes32 del rol requerido, o bytes32(0) si read-only.
     */
    function requiredRole() external view returns (bytes32 role_);
}
