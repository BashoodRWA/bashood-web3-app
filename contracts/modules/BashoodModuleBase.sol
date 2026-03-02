// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBashoodModule.sol";

/**
 * @title BashoodModuleBase
 * @notice Contrato abstracto base que todos los módulos externos del protocolo
 *         Bashood deben heredar.
 *
 * @dev Implementa IBashoodModule y provee:
 *   - Almacenamiento del Core como dirección inmutable.
 *   - Identidad del módulo (id, versión, rol requerido) fijada en construcción.
 *   - Control de ownership (Ownable) para configuración del módulo.
 *   - Guard `_requireNotZero` para validaciones rápidas de dirección.
 *   - Evento `CoreBound` emitido una sola vez en el constructor.
 *
 * HERENCIA ESPERADA
 * ─────────────────
 *   contract MiModulo is BashoodModuleBase {
 *       constructor(address core_)
 *           BashoodModuleBase(
 *               core_,
 *               keccak256("MiModulo/1.0"),
 *               "1.0.0",
 *               keccak256("ASSET_MANAGER_ROLE") // rol requerido en el Core
 *           )
 *       {}
 *       ...
 *   }
 *
 * Plan M4 – Patrón oficial de módulos Bashood.
 */
abstract contract BashoodModuleBase is IBashoodModule, Ownable {

    // ── Inmutables ───────────────────────────────────────────────────────────

    /// @dev Dirección del Core. Nunca cambia tras el deploy del módulo.
    address private immutable _core;

    /// @dev Identificador único del módulo: keccak256("<Nombre>/<versión>").
    bytes32 private immutable _moduleId;

    /// @dev Versión semántica legible.
    string  private           _moduleVersion;

    /**
     * @dev Rol del Core que el módulo necesita para operar sobre él.
     *
     * SENTINEL: bytes32(0) indica un módulo read-only (sin rol requerido).
     *   – El admin no necesita hacer grantRole() para estos módulos.
     *   – Un módulo read-only puede leer el Core y emitir eventos, pero no
     *     puede escribir en su storage.
     *   – Ejemplo: módulos de auditoría, snapshot, reporting off-chain.
     *
     * Si el módulo escribe en el Core, este campo debe corresponderse con un
     * rol real de AccessControl (ej. ASSET_MANAGER_ROLE).
     */
    bytes32 private immutable _requiredRole;

    // ── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param core_          Dirección del BashoodCore (no puede ser address(0)).
     *
     *   SINGLE-CORE BINDING: `core_` se almacena como immutable y nunca
     *   cambia tras el deploy. Un módulo está ligado a un único Core.
     *   Si se necesita operar sobre dos Cores diferentes se despliegan
     *   dos instancias del módulo. Esta restricción hace que el rol
     *   otorgado sea perfectamente auditable en cualquier momento.
     *
     * @param moduleId_      keccak256 del identificador del módulo.
     *                       Formato: keccak256("<Nombre>/<versión-mayor>").
     *                       Es el identificador canónico e inmutable.
     * @param version_       Cadena de versión semántica legible ("1.0.0").
     *
     *   VERSION SEMANTICS: `moduleVersion` es metadata legible solamente.
     *   La identidad canónica del módulo es `moduleId` (immutable).
     *   No está permitido añadir un setter para `moduleVersion`; hacerlo
     *   desacoplaría la versión visible del identificador inmutable.
     *   El único mecanismo de upgrade es: deploy nueva versión → revocar
     *   rol del módulo viejo → otorgar rol al módulo nuevo.
     *
     * @param requiredRole_  bytes32 del rol que el admin debe otorgar al módulo.
     *                       Pasar bytes32(0) para módulos read-only (sin rol).
     */
    constructor(
        address core_,
        bytes32 moduleId_,
        string memory version_,
        bytes32 requiredRole_
    ) Ownable(msg.sender) {
        require(core_ != address(0),    "BashoodModule: core is zero address");
        require(moduleId_ != bytes32(0),"BashoodModule: moduleId is zero");
        require(bytes(version_).length > 0,  "BashoodModule: version is empty");

        _core         = core_;
        _moduleId     = moduleId_;
        _moduleVersion = version_;
        _requiredRole  = requiredRole_;

        emit CoreBound(core_);
    }

    // ── IBashoodModule ───────────────────────────────────────────────────────

    /// @inheritdoc IBashoodModule
    function coreContract() external view override returns (address) {
        return _core;
    }

    /// @inheritdoc IBashoodModule
    function moduleId() external view override returns (bytes32) {
        return _moduleId;
    }

    /// @inheritdoc IBashoodModule
    function moduleVersion() external view override returns (string memory) {
        return _moduleVersion;
    }

    /// @inheritdoc IBashoodModule
    function requiredRole() external view override returns (bytes32) {
        return _requiredRole;
    }

    // ── Helpers internos ─────────────────────────────────────────────────────

    /**
     * @dev Devuelve la dirección del Core para uso interno de subcontratos.
     *      Usar en lugar de `this.coreContract()` para evitar una llamada externa.
     */
    function _coreAddress() internal view returns (address) {
        return _core;
    }

    /**
     * @dev Guard: revierte si la dirección es address(0).
     * @param addr    Dirección a verificar.
     * @param label   Cadena de error que identifica el parámetro.
     */
    function _requireNotZero(address addr, string memory label) internal pure {
        require(addr != address(0), label);
    }

    /**
     * @dev Guard: revierte si el tokenId es 0 (nunca válido en el Core).
     */
    function _requireValidToken(uint256 tokenId) internal pure {
        require(tokenId > 0, "BashoodModule: tokenId is zero");
    }
}
