 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
 
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
 
contract BashoodMultiToken is ERC1155, Ownable, ReentrancyGuard, AccessControl {
    uint256 public constant BASHOOD_TOKEN = 1;
    uint256 public constant BASHOOD_NFT = 2;
 
    uint256 public rate = 1000;
    uint256 public totalRaised;
    uint256 public nftCounter = 1;
 
    mapping(address => uint256) public contributions;
    mapping(uint256 => address) public nftOwners;
 
    event TokensPurchased(address indexed buyer, uint256 amount);
    event NFTMinted(address indexed buyer, uint256 tokenId);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event MarketplaceApproved(address indexed user, address indexed marketplace, uint256 approved);
 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
 
    constructor(address initialOwner) ERC1155("https://myapi.com/metadata/{id}.json") {
        transferOwnership(initialOwner);
        _setupRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _setupRole(MINTER_ROLE, initialOwner);
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
 
    function mintAllNFTs() external onlyOwner {
        require(nftCounter == 1, "NFTs ya han sido minteados");
 
        for (uint256 i = 1; i <= 30; i++) {
            _mint(owner(), BASHOOD_NFT, 1, "");
            nftOwners[i] = owner();
            nftCounter++;
        }
    }
 
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No hay fondos");
 
        payable(owner()).transfer(balance);
        emit FundsWithdrawn(owner(), balance);
    }
}
 
 
 


