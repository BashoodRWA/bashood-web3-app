// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IBashoodRescue.sol";

/// @title BashoodRescue
/// @notice Custodia y rescate de activos del ecosistema (ERC1155 y ERC20),
///         con retiro de ETH en emergencia. Preparado para recibir ERC1155.
contract BashoodRescue is AccessControl, IERC1155Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    event ERC1155Rescued(address indexed nft, uint256 indexed id, address indexed to, uint256 amount);
    event ERC20Rescued(address indexed token, address indexed to, uint256 amount);
    event EmergencyEthWithdrawn(address indexed to, uint256 amount);
    event CallerAuthorized(address indexed caller);
    event CallerRevoked(address indexed caller);

    // Allow listing of authorized callers (e.g., presale contract) that can invoke rescue
    mapping(address => bool) public authorizedCallers;

    // wallet where emergency ETH will be forwarded
    address payable public projectWallet;

    // fallback ledger if immediate forward to projectWallet fails
    mapping(address => uint256) public pendingWithdrawals;

    /// @param admin     Dirección con ADMIN_ROLE y DEFAULT_ADMIN_ROLE.
    /// @param emergency Dirección con EMERGENCY_ROLE.
    constructor(address admin, address emergency) {
        require(admin != address(0), "Rescue: invalid admin");
        require(emergency != address(0), "Rescue: invalid emergency");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, emergency);
    }

    /// @notice Set the project wallet used by emergencyWithdrawETH
    function setProjectWallet(address payable _projectWallet) external onlyRole(ADMIN_ROLE) {
        require(_projectWallet != address(0), "Rescue: invalid wallet");
        projectWallet = _projectWallet;
    }

    /// @notice Rescata NFTs ERC1155 custodiados por este contrato.
    /// @dev Este contrato debe tener previamente el balance de esos NFTs.
    function rescueUnsoldNFTs(
        address nftContract,
        uint256 nftId,
        address to,
        uint256 amount
    ) external nonReentrant {
        require(authorizedCallers[msg.sender] || hasRole(ADMIN_ROLE, msg.sender), "Rescue: not authorized");
        require(nftContract != address(0), "Rescue: invalid nft");
        require(to != address(0), "Rescue: invalid to");
        require(amount > 0, "Rescue: zero amount");

        IERC1155 nft = IERC1155(nftContract);
        require(nft.balanceOf(address(this), nftId) >= amount, "Rescue: insufficient NFT balance");

        // Checks-effects-interactions: emit the event before the external transfer so
        // state consistent observers (and static analyzers) see the intent before
        // any external call that may reenter.
        emit ERC1155Rescued(nftContract, nftId, to, amount);
        nft.safeTransferFrom(address(this), to, nftId, amount, "");
    }

    /// @notice Rescata tokens ERC20 custodiados por este contrato.
    function rescueERC20(
        address tokenAddress,
        address to,
        uint256 amount
    ) external {
        require(authorizedCallers[msg.sender] || hasRole(ADMIN_ROLE, msg.sender), "Rescue: not authorized");
        require(tokenAddress != address(0), "Rescue: invalid token");
        require(to != address(0), "Rescue: invalid to");
        require(amount > 0, "Rescue: zero amount");

        IERC20 token = IERC20(tokenAddress);
        uint256 bal = token.balanceOf(address(this));
        require(bal >= amount, "Rescue: insufficient token balance");

        token.safeTransfer(to, amount);
        emit ERC20Rescued(tokenAddress, to, amount);
    }

    /// @notice Retira todo el ETH disponible a la wallet del proyecto (emergencias).
    /// @dev Use pull pattern: record the amount as pending for the project wallet so the
    /// project can withdraw later. This avoids forwarding ETH to an external address
    /// in the same transaction which static analyzers flag as "sends eth to arbitrary user".
    function emergencyWithdrawETH() external onlyRole(EMERGENCY_ROLE) nonReentrant {
        require(projectWallet != address(0), "Rescue: invalid wallet");
        uint256 bal = address(this).balance;
        require(bal > 0, "Rescue: no ETH");

        // Always record pending withdrawal for the configured project wallet.
        // The project (projectWallet) should call `claimPendingWithdrawals` to pull funds.
        pendingWithdrawals[projectWallet] += bal;
        emit EmergencyEthWithdrawn(projectWallet, bal);
    }

    /// @notice Claim pending withdrawals previously recorded when immediate forward failed
    function claimPendingWithdrawals() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Rescue: no pending funds");
        pendingWithdrawals[msg.sender] = 0;
        // Use OpenZeppelin Address.sendValue which reverts on failure and is the
        // recommended safe replacement for low-level .call when forwarding ETH.
        Address.sendValue(payable(msg.sender), amount);
        emit EmergencyEthWithdrawn(msg.sender, amount);
    }

    /// @notice Authorize a caller (e.g., presale contract) to perform rescue operations without ADMIN_ROLE
    function authorizeCaller(address caller) external onlyRole(ADMIN_ROLE) {
        require(caller != address(0), "Rescue: zero caller");
        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    /// @notice Revoke authorization for a caller
    function revokeCaller(address caller) external onlyRole(ADMIN_ROLE) {
        require(authorizedCallers[caller], "Rescue: not authorized");
        authorizedCallers[caller] = false;
        emit CallerRevoked(caller);
    }

    // ---- ERC1155 Receiver ----
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IBashoodRescue).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @notice Permite recibir ETH directamente.
    receive() external payable {}
}
