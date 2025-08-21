&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
15×
15×
15×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
6×
5×
&nbsp;
&nbsp;
&nbsp;
2×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
&nbsp;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
&nbsp;
contract BashoodMultiToken is ERC1155, Ownable, ReentrancyGuard, AccessControl {
    uint256 public constant BASHOOD_TOKEN = 1;
    uint256 public constant BASHOOD_NFT = 2;
&nbsp;
    uint256 public rate = 1000;
    uint256 public totalRaised;
    uint256 public nftCounter = 1;
&nbsp;
    mapping(address =&gt; uint256) public contributions;
    mapping(uint256 =&gt; address) public nftOwners;
&nbsp;
    event TokensPurchased(address indexed buyer, uint256 amount);
    event NFTMinted(address indexed buyer, uint256 tokenId);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event MarketplaceApproved(address indexed user, address indexed marketplace, uint256 approved);
&nbsp;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
&nbsp;
    constructor(address initialOwner) ERC1155("https://myapi.com/metadata/{id}.json") {
        transferOwnership(initialOwner);
        _setupRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _setupRole(MINTER_ROLE, initialOwner);
    }
&nbsp;
    function grantMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }
&nbsp;
    function revokeMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }
&nbsp;
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mintBatch(to, ids, amounts, data);
    }
&nbsp;
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, id, amount, data);
    }
&nbsp;
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
&nbsp;
    function approveMarketplace(address marketplace, bool approved) external {
        setApprovalForAll(marketplace, approved);
        emit MarketplaceApproved(msg.sender, marketplace, approved ? 1 : 0);
    }
&nbsp;
    function buyTokens() external payable nonReentrant {
        require(msg.value &gt; 0, "Debe enviar ETH");
&nbsp;
        uint256 tokensToReceive = msg.value * rate;
        totalRaised += msg.value;
        contributions[msg.sender] += msg.value;
&nbsp;
        _mint(msg.sender, BASHOOD_TOKEN, tokensToReceive, "");
        emit TokensPurchased(msg.sender, tokensToReceive);
    }
&nbsp;
    function mintAllNFTs() external onlyOwner {
        require(nftCounter == 1, "NFTs ya han sido minteados");
&nbsp;
        for (uint256 i = 1; i &lt;= 30; i++) {
            _mint(owner(), BASHOOD_NFT, 1, "");
            nftOwners[i] = owner();
            nftCounter++;
        }
    }
&nbsp;
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance &gt; 0, "No hay fondos");
&nbsp;
        payable(owner()).transfer(balance);
        emit FundsWithdrawn(owner(), balance);
    }
}
&nbsp;
&nbsp;
&nbsp;
