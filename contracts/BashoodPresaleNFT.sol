// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BashoodPresaleNFT
 * @author Bashood Team
 * @notice ERC-1155 NFT de presale. Cada token ID representa un tier de activo real distinto,
 *         con supply propio, hash de documento legal anclado on-chain, y metadata en IPFS.
 *
 * @dev Diseño deliberado:
 *  - Un contrato por protocolo, sin lógica de precio ni fungibles mezclados.
 *  - MINTER_ROLE se asigna exclusivamente a BashoodPresaleFinal (o admin para pre-carga).
 *  - Transferencias restringidas por defecto (modo KYC). El admin las libera cuando legal lo apruebe.
 *  - OZ v5: usa _update() como hook de transferencia (reemplaza _beforeTokenTransfer).
 *  - EIP-2981: royalties configurables para el mercado secundario.
 *  - URI obligatoriamente IPFS. El metadata off-chain debe incluir el campo `legal_hash`
 *    coincidente con tiers[id].legalDocHash.
 *
 * @custom:security-contact security@bashood.io
 */
contract BashoodPresaleNFT is ERC1155, ERC2981, AccessControl, Pausable, ReentrancyGuard {

    // ── Roles ──────────────────────────────────────────────────────────────────

    /// @notice Rol para mintear tokens. Asignar exclusivamente a BashoodPresaleFinal.
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");

    /// @notice Rol para definir y configurar tiers de activos.
    bytes32 public constant ASSET_MANAGER = keccak256("ASSET_MANAGER");

    // ── Structs ────────────────────────────────────────────────────────────────

    /// @notice Metadata on-chain de un tier de activo real.
    struct AssetTier {
        string  assetName;      // Nombre del activo, ej. "Excavadora CAT 390F"
        string  assetType;      // Categoría, ej. "heavy_machinery" | "solar_plant"
        string  jurisdiction;   // Código ISO 3166-1 alpha-2, ej. "ES", "AE", "DE"
        uint256 maxSupply;      // Supply máximo para este tier — inmutable tras primer mint
        bytes32 legalDocHash;   // SHA-256 del documento legal firmado que define los derechos
        bool    defined;        // true una vez que el tier ha sido configurado
    }

    // ── State ──────────────────────────────────────────────────────────────────

    /// @notice Metadata on-chain por tier. Accesible públicamente.
    mapping(uint256 => AssetTier) public tiers;

    /// @notice Cantidad ya minteada para cada tier. Nunca puede superar tiers[id].maxSupply.
    mapping(uint256 => uint256) public mintedPerTier;

    /// @notice URI IPFS por tier. Siempre empieza por "ipfs://".
    mapping(uint256 => string) private _tierURI;

    /// @notice Addresses autorizadas a recibir/enviar transfers en modo restringido.
    mapping(address => bool) public transferWhitelist;

    /// @notice Si true, solo las addresses whitelisted pueden transferir (modo KYC activo).
    bool public transfersRestricted;

    // ── Events ─────────────────────────────────────────────────────────────────

    /// @notice Emitido cuando un nuevo tier de activo es definido o reconfigurado.
    event AssetDefined(
        uint256 indexed tierId,
        string  assetName,
        string  assetType,
        string  jurisdiction,
        uint256 maxSupply,
        bytes32 legalDocHash,
        string  tierURI
    );

    /// @notice Emitido en cada operación de mint. Proporciona trazabilidad completa.
    event AssetMinted(
        uint256 indexed tierId,
        address indexed to,
        uint256 amount,
        uint256 totalMintedForTier
    );

    /// @notice Emitido cuando cambia el modo de restricción de transferencias.
    event TransferRestrictionChanged(bool restricted);

    /// @notice Emitido cuando se añade o elimina una address del whitelist de transferencias.
    event TransferWhitelistUpdated(address indexed account, bool allowed);

    // ── Constructor ────────────────────────────────────────────────────────────

    /**
     * @param admin Address que recibe DEFAULT_ADMIN_ROLE y ASSET_MANAGER.
     *              Debe ser un multisig en producción.
     */
    constructor(address admin) ERC1155("") {
        require(admin != address(0), "Admin required");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ASSET_MANAGER, admin);

        // Modo seguro por defecto: transferencias restringidas hasta aprobación legal
        transfersRestricted = true;

        // El admin puede mover NFTs antes de asignar el presale (ej. pre-carga al contrato)
        transferWhitelist[admin] = true;
    }

    // ── Definición de tiers ────────────────────────────────────────────────────

    /**
     * @notice Define o reconfigura un tier de activo. Solo ASSET_MANAGER.
     * @dev La reconfiguración solo es posible antes del primer mint del tier.
     *      Una vez que hay tokens emitidos, el tier es inmutable para proteger a los compradores.
     *
     * @param tierId       Token ID a definir (ej. 1 para TIER_A, 2 para TIER_B)
     * @param assetName    Nombre del activo real, ej. "Excavadora CAT 390F"
     * @param assetType    Categoría del activo, ej. "heavy_machinery"
     * @param jurisdiction Código de país ISO 3166-1 alpha-2, ej. "ES"
     * @param maxSupply    Cantidad máxima de tokens para este tier
     * @param legalDocHash SHA-256 del documento legal firmado que define los derechos del tenedor
     * @param tierURI      URI del metadata en IPFS, ej. "ipfs://QmXxx.../1.json"
     */
    function defineAsset(
        uint256 tierId,
        string  calldata assetName,
        string  calldata assetType,
        string  calldata jurisdiction,
        uint256 maxSupply,
        bytes32 legalDocHash,
        string  calldata tierURI
    ) external onlyRole(ASSET_MANAGER) {
        require(mintedPerTier[tierId] == 0, "Tier immutable: already has minted tokens");
        require(maxSupply > 0,              "maxSupply must be > 0");
        require(legalDocHash != bytes32(0), "Legal doc hash required");
        require(bytes(assetName).length > 0,"Asset name required");
        require(bytes(tierURI).length > 0,  "URI required");
        require(_startsWithIPFS(tierURI),   "URI must use ipfs:// scheme");

        tiers[tierId] = AssetTier({
            assetName:    assetName,
            assetType:    assetType,
            jurisdiction: jurisdiction,
            maxSupply:    maxSupply,
            legalDocHash: legalDocHash,
            defined:      true
        });

        _tierURI[tierId] = tierURI;

        emit AssetDefined(tierId, assetName, assetType, jurisdiction, maxSupply, legalDocHash, tierURI);
    }

    // ── Minting ────────────────────────────────────────────────────────────────

    /**
     * @notice Mintea tokens para un tier definido. Solo MINTER_ROLE.
     * @dev Enforces maxSupply por tier. En producción, MINTER_ROLE = BashoodPresaleFinal.
     *
     * @param to     Destinatario (normalmente BashoodPresaleFinal para pre-cargar el presale)
     * @param tierId Token ID del tier a mintear
     * @param amount Cantidad a mintear
     */
    function mint(
        address to,
        uint256 tierId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        require(tiers[tierId].defined,    "Tier not defined");
        require(to != address(0),         "Zero recipient");
        require(amount > 0,               "Amount must be > 0");
        require(
            mintedPerTier[tierId] + amount <= tiers[tierId].maxSupply,
            "Exceeds tier max supply"
        );

        mintedPerTier[tierId] += amount;
        _mint(to, tierId, amount, "");

        emit AssetMinted(tierId, to, amount, mintedPerTier[tierId]);
    }

    // ── URI y metadata ─────────────────────────────────────────────────────────

    /**
     * @notice Devuelve la URI IPFS del metadata para un tier.
     * @dev El metadata off-chain en esa URI debe incluir el campo `legal_hash`
     *      con el valor hexadecimal de tiers[tierId].legalDocHash para ser verificable.
     */
    function uri(uint256 tierId) public view override returns (string memory) {
        require(tiers[tierId].defined, "Tier not defined");
        return _tierURI[tierId];
    }

    /**
     * @notice Acceso directo al hash del documento legal de un tier.
     * @dev Convenience getter — equivalente a tiers[tierId].legalDocHash.
     *      Facilita la verificación desde frontends sin decodificar el struct completo.
     */
    function legalDocumentHash(uint256 tierId) external view returns (bytes32) {
        return tiers[tierId].legalDocHash;
    }

    // ── Restricción de transferencias (modo KYC) ───────────────────────────────

    /**
     * @notice Activa o desactiva el modo de restricción de transferencias.
     * @dev Desactivar solo cuando el equipo legal apruebe trading abierto.
     *      Solo DEFAULT_ADMIN_ROLE.
     */
    function setTransferRestriction(bool restricted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transfersRestricted = restricted;
        emit TransferRestrictionChanged(restricted);
    }

    /**
     * @notice Añade o elimina una address del whitelist de transferencias.
     * @dev En modo KYC activo, solo las addresses whitelisted pueden enviar/recibir.
     *      Añadir aquí al contrato BashoodPresaleFinal para que pueda distribuir NFTs.
     */
    function setTransferWhitelist(address account, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Zero address");
        transferWhitelist[account] = allowed;
        emit TransferWhitelistUpdated(account, allowed);
    }

    // ── Pausa ──────────────────────────────────────────────────────────────────

    /// @notice Pausa el contrato. Solo DEFAULT_ADMIN_ROLE.
    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }

    /// @notice Reanuda el contrato. Solo DEFAULT_ADMIN_ROLE.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ── EIP-2981 Royalties ─────────────────────────────────────────────────────

    /**
     * @notice Configura royalties para el mercado secundario. Solo DEFAULT_ADMIN_ROLE.
     * @param receiver     Receptor de royalties (multisig de Bashood recomendado)
     * @param feeNumerator Royalty en basis points sobre el precio de venta (ej. 500 = 5%)
     */
    function setDefaultRoyalty(
        address receiver,
        uint96  feeNumerator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(receiver != address(0), "Zero royalty receiver");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Elimina la configuración de royalties por defecto.
     * @dev Usar solo si se va a configurar royalties por tier individual.
     */
    function deleteDefaultRoyalty() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _deleteDefaultRoyalty();
    }

    // ── Internal hooks (OZ v5) ─────────────────────────────────────────────────

    /**
     * @dev Hook OZ v5 que reemplaza _beforeTokenTransfer. Se ejecuta en mint, burn y transfer.
     *
     *      Controles aplicados:
     *      1. Pausa: rechaza toda operación si el contrato está pausado.
     *      2. Restricción KYC: cuando transfersRestricted == true, solo permite transferencias
     *         entre addresses whitelisted. Mint (from == address(0)) y burn (to == address(0))
     *         están siempre permitidos independientemente del whitelist.
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Control 1: pausa
        require(!paused(), "BashoodPresaleNFT: contract paused");

        // Control 2: KYC — solo aplica a transferencias puras (no mint, no burn)
        if (transfersRestricted && from != address(0) && to != address(0)) {
            require(
                transferWhitelist[from] && transferWhitelist[to],
                "BashoodPresaleNFT: transfer restricted, KYC required"
            );
        }

        super._update(from, to, ids, values);
    }

    // ── supportsInterface ──────────────────────────────────────────────────────

    /**
     * @dev Declara soporte para ERC1155, ERC2981 (royalties), AccessControl y ERC165.
     */
    function supportsInterface(bytes4 interfaceId)
        public view virtual
        override(ERC1155, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ── Helpers internos ───────────────────────────────────────────────────────

    /**
     * @dev Verifica que una URI comience por "ipfs://" (7 caracteres).
     *      Bloquea URIs centralizadas (http/https) que podrían desaparecer.
     */
    function _startsWithIPFS(string calldata s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        if (b.length < 7) return false;
        return (
            b[0] == "i" && b[1] == "p" && b[2] == "f" &&
            b[3] == "s" && b[4] == ":" && b[5] == "/" && b[6] == "/"
        );
    }
}
