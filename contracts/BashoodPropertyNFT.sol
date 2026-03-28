// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title BashoodPropertyNFT - Real Estate NFT Collection
/// @notice NFT contract for tokenizing real estate properties in the Bashood ecosystem
/// @dev Extends ERC721 with enumerable, URI storage, and advanced property management
///      Uses SafeERC20 for all ERC20 token interactions.
contract BashoodPropertyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    // ==================== STRUCTS ====================
    
    /// @notice Property metadata structure
    struct PropertyData {
        string name;              // Property name/title
        string description;       // Property description
        string location;          // Physical location
        uint256 propertyType;     // Type: 1=House, 2=Apartment, 3=Commercial, etc.
        uint256 area;             // Area in square meters
        uint256 estimatedValue;   // Estimated value in USD (scaled by 1e18)
        uint256 mintTimestamp;    // When it was minted
        bool isActive;            // Whether property is active
        string[] amenities;       // List of amenities
        string imageHash;         // IPFS hash of main image
        address originalOwner;    // Original minter
    }
    
    /// @notice Property type definitions
    enum PropertyType {
        UNKNOWN,     // 0
        HOUSE,       // 1 - Single family house
        APARTMENT,   // 2 - Apartment/condo
        COMMERCIAL,  // 3 - Commercial property
        LAND,        // 4 - Raw land
        VILLA,       // 5 - Luxury villa
        TOWNHOUSE,   // 6 - Townhouse
        PENTHOUSE    // 7 - Penthouse
    }
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Base URI for metadata
    string private _baseTokenURI;
    
    /// @notice Mapping from token ID to property data
    mapping(uint256 => PropertyData) public properties;
    
    /// @notice Mapping from property type to count
    mapping(uint256 => uint256) public propertyTypeCount;
    
    /// @notice Current token ID counter
    uint256 private _tokenIdCounter = 1;
    
    /// @notice Maximum supply limit
    uint256 public constant MAX_SUPPLY = 10000;
    
    /// @notice Role for authorized minters
    bytes32 public constant AUTHORIZED_MINTER_ROLE = keccak256("AUTHORIZED_MINTER_ROLE");
    
    /// @notice Minting fee (can be 0 for authorized minters)
    uint256 public mintingFee = 0.01 ether;
    
    /// @notice Authorized minters mapping
    mapping(address => bool) public authorizedMinters;
    
    /// @notice Whether public minting is enabled
    bool public publicMintingEnabled = false;
    
    // ==================== EVENTS ====================
    
    event PropertyMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        uint256 propertyType,
        uint256 estimatedValue
    );
    
    event PropertyUpdated(
        uint256 indexed tokenId,
        string name,
        uint256 estimatedValue
    );
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event PublicMintingToggled(bool enabled);
    event MintingFeeUpdated(uint256 newFee);
    event BaseURIUpdated(string newBaseURI);
    
    // ==================== MODIFIERS ====================
    
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(
        string memory baseURI
    ) ERC721("Bashood Property NFT", "BPNFT") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        
        // Owner is automatically an authorized minter
        authorizedMinters[msg.sender] = true;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORIZED_MINTER_ROLE, msg.sender);
        
        emit MinterAdded(msg.sender);
        emit BaseURIUpdated(baseURI);
    }
    
    // ==================== MINTING FUNCTIONS ====================
    
    /// @notice Mint a new property NFT (authorized minters only)
    /// @param to Address to mint the NFT to
    /// @param propertyData Property metadata
    /// @param customTokenURI Custom URI for this token
    /// @return tokenId The newly minted token ID
    function mintProperty(
        address to,
        PropertyData memory propertyData,
        string memory customTokenURI
    ) external onlyAuthorizedMinter nonReentrant whenNotPaused returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(_tokenIdCounter <= MAX_SUPPLY, "Max supply exceeded");
        require(bytes(propertyData.name).length > 0, "Property name required");
        require(propertyData.propertyType > 0 && propertyData.propertyType <= uint256(PropertyType.PENTHOUSE), "Invalid property type");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Set property data
        propertyData.mintTimestamp = block.timestamp;
        propertyData.isActive = true;
        propertyData.originalOwner = to;
        properties[tokenId] = propertyData;
        
        // Update type counter
        propertyTypeCount[propertyData.propertyType]++;
        
        // Mint the NFT
        _safeMint(to, tokenId);
        
        // Set custom URI if provided
        if (bytes(customTokenURI).length > 0) {
            _setTokenURI(tokenId, customTokenURI);
        }
        
        emit PropertyMinted(tokenId, to, propertyData.name, propertyData.propertyType, propertyData.estimatedValue);
        
        return tokenId;
    }
    
    /// @notice Public minting function (if enabled)
    /// @param propertyData Property metadata
    /// @param customTokenURI Custom URI for this token
    /// @return tokenId The newly minted token ID
    function publicMint(
        PropertyData memory propertyData,
        string memory customTokenURI
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(publicMintingEnabled, "Public minting not enabled");
        require(msg.value >= mintingFee, "Insufficient minting fee");
        require(_tokenIdCounter <= MAX_SUPPLY, "Max supply exceeded");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Set property data
        propertyData.mintTimestamp = block.timestamp;
        propertyData.isActive = true;
        propertyData.originalOwner = msg.sender;
        properties[tokenId] = propertyData;
        
        // Update type counter
        propertyTypeCount[propertyData.propertyType]++;
        
        // Mint the NFT
        _safeMint(msg.sender, tokenId);
        
        // Set custom URI if provided
        if (bytes(customTokenURI).length > 0) {
            _setTokenURI(tokenId, customTokenURI);
        }
        
        emit PropertyMinted(tokenId, msg.sender, propertyData.name, propertyData.propertyType, propertyData.estimatedValue);
        
        // Refund excess payment
        if (msg.value > mintingFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - mintingFee}("");
            require(success, "Refund failed");
        }
        
        return tokenId;
    }
    
    // ==================== PROPERTY MANAGEMENT ====================
    
    /// @notice Update property data (owner only)
    /// @param tokenId Token ID to update
    /// @param newName New property name
    /// @param newDescription New description
    /// @param newEstimatedValue New estimated value
    function updateProperty(
        uint256 tokenId,
        string memory newName,
        string memory newDescription,
        uint256 newEstimatedValue
    ) external validTokenId(tokenId) {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        
        PropertyData storage property = properties[tokenId];
        property.name = newName;
        property.description = newDescription;
        property.estimatedValue = newEstimatedValue;
        
        emit PropertyUpdated(tokenId, newName, newEstimatedValue);
    }
    
    /// @notice Toggle property active status (owner only)
    /// @param tokenId Token ID to toggle
    function togglePropertyStatus(uint256 tokenId) external onlyOwner validTokenId(tokenId) {
        properties[tokenId].isActive = !properties[tokenId].isActive;
    }
    
    /// @notice Add amenities to a property
    /// @param tokenId Token ID
    /// @param amenities Array of amenities to add
    function addAmenities(uint256 tokenId, string[] memory amenities) external validTokenId(tokenId) {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        
        PropertyData storage property = properties[tokenId];
        for (uint256 i = 0; i < amenities.length; i++) {
            property.amenities.push(amenities[i]);
        }
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /// @notice Get property data by token ID
    /// @param tokenId Token ID to query
    /// @return PropertyData struct
    function getProperty(uint256 tokenId) external view validTokenId(tokenId) returns (PropertyData memory) {
        return properties[tokenId];
    }
    
    /// @notice Get property amenities
    /// @param tokenId Token ID to query
    /// @return Array of amenities
    function getPropertyAmenities(uint256 tokenId) external view validTokenId(tokenId) returns (string[] memory) {
        return properties[tokenId].amenities;
    }
    
    /// @notice Get properties by type
    /// @param propertyType Type to filter by
    /// @return Array of token IDs
    function getPropertiesByType(uint256 propertyType) external view returns (uint256[] memory) {
        uint256 count = propertyTypeCount[propertyType];
        uint256[] memory result = new uint256[](count);
        uint256 resultIndex = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            if (properties[i].propertyType == propertyType) {
                result[resultIndex] = i;
                resultIndex++;
            }
        }
        
        return result;
    }
    
    /// @notice Get properties by owner
    /// @param owner Address to query
    /// @return Array of token IDs
    function getPropertiesByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            result[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return result;
    }
    
    /// @notice Get total value of properties owned by an address
    /// @param owner Address to query
    /// @return Total estimated value
    function getTotalValueByOwner(address owner) external view returns (uint256) {
        uint256 balance = balanceOf(owner);
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            totalValue += properties[tokenId].estimatedValue;
        }
        
        return totalValue;
    }
    
    /// @notice Get collection statistics
    /// @return total Total minted, houses House count, apartments Apartment count, commercial Commercial count
    function getCollectionStats() external view returns (
        uint256 total,
        uint256 houses,
        uint256 apartments,
        uint256 commercial,
        uint256 land,
        uint256 villas
    ) {
        total = _tokenIdCounter - 1;
        houses = propertyTypeCount[uint256(PropertyType.HOUSE)];
        apartments = propertyTypeCount[uint256(PropertyType.APARTMENT)];
        commercial = propertyTypeCount[uint256(PropertyType.COMMERCIAL)];
        land = propertyTypeCount[uint256(PropertyType.LAND)];
        villas = propertyTypeCount[uint256(PropertyType.VILLA)];
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /// @notice Add authorized minter
    /// @param minter Address to authorize
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid address");
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /// @notice Remove authorized minter
    /// @param minter Address to remove
    function removeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /// @notice Toggle public minting
    /// @param enabled Whether to enable public minting
    function setPublicMintingEnabled(bool enabled) external onlyOwner {
        publicMintingEnabled = enabled;
        emit PublicMintingToggled(enabled);
    }
    
    /// @notice Set minting fee
    /// @param fee New fee amount
    function setMintingFee(uint256 fee) external onlyOwner {
        mintingFee = fee;
        emit MintingFeeUpdated(fee);
    }
    
    /// @notice Set base URI for metadata
    /// @param baseURI New base URI
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }
    
    /// @notice Pause contract
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Withdraw contract balance
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /// @notice Emergency token recovery
    /// @param tokenAddress Token contract address
    /// @param amount Amount to recover
    function emergencyTokenRecovery(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(this), "Cannot recover own tokens");
        IERC20(tokenAddress).safeTransfer(owner(), amount);
    }
    
    // ==================== INTERNAL FUNCTIONS ====================
    
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}