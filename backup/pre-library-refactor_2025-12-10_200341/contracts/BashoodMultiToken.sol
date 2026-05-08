// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
 
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
 
contract BashoodMultiToken is ERC1155, Ownable, ReentrancyGuard, AccessControl {
    // Constantes optimizadas
    uint256 public constant BASHOOD_TOKEN = 1;
    uint256 public constant BASHOOD_NFT = 2;
    uint256 private constant _MAX_NFT_COUNT = 30;
    uint256 private constant _DEFAULT_RATE = 1000;
    
    // Variables optimizadas
    uint256 public rate;
    uint256 public totalRaised;
    uint256 public nftCounter;
 
    mapping(address => uint256) public contributions;
    mapping(uint256 => address) public nftOwners;
 
    event TokensPurchased(address indexed buyer, uint256 amount);
    event NFTMinted(address indexed buyer, uint256 tokenId);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event MarketplaceApproved(address indexed user, address indexed marketplace, uint256 approved);
 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
 
    constructor(address initialOwner) ERC1155("https://myapi.com/metadata/{id}.json") Ownable(initialOwner) {
        require(initialOwner != address(0), "BashoodMultiToken: invalid owner");
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        
        // Inicializar variables optimizadas
        rate = _DEFAULT_RATE;
        nftCounter = 1;
    }
 
    function grantMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }
 
    function revokeMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }
 
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mintBatch(to, ids, amounts, data);
    }
 
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, id, amount, data);
    }
 
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
 
    function approveMarketplace(address marketplace, bool approved) external {
        setApprovalForAll(marketplace, approved);
        emit MarketplaceApproved(msg.sender, marketplace, approved ? 1 : 0);
    }
 
    function buyTokens() external payable nonReentrant {
        require(msg.value > 0, "Debe enviar ETH");
 
        uint256 tokensToReceive = msg.value * rate;
        totalRaised += msg.value;
        contributions[msg.sender] += msg.value;
 
        _mint(msg.sender, BASHOOD_TOKEN, tokensToReceive, "");
        emit TokensPurchased(msg.sender, tokensToReceive);
    }
 
    function mintAllNFTs() external onlyOwner nonReentrant {
        require(nftCounter == 1, "NFTs ya han sido minteados");

        // defense-in-depth: mark nftCounter as final value before minting to avoid
        // potential reentrancy or callback-based re-entry relying on the precondition.
        nftCounter = _MAX_NFT_COUNT + 1;

        address contractOwner = owner();

        for (uint256 i = 1; i <= _MAX_NFT_COUNT; i++) {
             // write state BEFORE calling into external/on-receive hooks to avoid
            // reentrancy windows where a receiver's callback could re-enter.
            nftOwners[i] = contractOwner;
            _mint(contractOwner, BASHOOD_NFT, 1, "");
            // nftCounter already set to final value
        }
    }
 
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No hay fondos");

        // Effects done before interaction
        emit FundsWithdrawn(owner(), balance);
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "Transfer failed");
    }
}
 
 
 


