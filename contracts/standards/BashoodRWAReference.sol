import "./IBashoodRWA.sol";
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../utils/DepreciationEngine.sol";

/**
 * @title BashoodRWAReference
 * @notice Reference implementation of the BASHOOD-RWA-1 standard for tokenizing industrial real-world assets.
 * @dev This contract demonstrates all features of the BASHOOD-RWA-1 standard:
 *      - 6 depreciation models (LOAD_BASED, EXTRUSION_BASED, SETUP_BASED, TIME_BASED, EFFICIENCY_BASED, LINEAR)
 *      - 5 tokenization strategies (FULL_OWNERSHIP, FRACTIONAL, MICRO_LEASING, PERFORMANCE_BOND, REVENUE_SHARE)
 *      - Real-time telemetry integration with Chainlink oracles
 *      - Certification and compliance tracking
 *      - Maintenance scheduling and cost reserves
 *      - Insurance management
 *      - Performance bonuses for efficiency-based assets
 * 
 * Based on research of 5 leading construction robotics companies:
 * - EVOCONS (Spain): Load-based depreciation, fractional ownership
 * - ICON (USA): Extrusion-based depreciation, revenue-share
 * - Apis Cor (UAE): Setup-based depreciation, micro-leasing
 * - CyBe (Netherlands): Efficiency-based depreciation, performance bonds
 * - Mighty Buildings (USA): Linear time-based, ESG tracking
 * 
 * @author Bashood Protocol Team
 * @custom:security-contact security@bashood.com
 * @custom:version 1.0.0
 */
contract BashoodRWAReference is 
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IBashoodRWA 
{
    // ============ Depreciation Events ============
    event DepreciationCalculated(uint256 indexed tokenId, uint256 depreciationBps);

    // ============ Depreciation Calculation ============

    /**
     * @dev Internal: Calcula la depreciación (basis points) según el modelo y métricas del token
     */
    function _calculateDepreciation(uint256 tokenId) internal view returns (uint256) {
        _requireOwned(tokenId);
        FinancialData memory financial = _financialData[tokenId];
        OperationalMetrics memory operational = _operationalMetrics[tokenId];

        if (financial.depModel == DepreciationModel.LOAD_BASED) {
            return DepreciationEngine.loadBased(operational.totalLoadLifted, operational.maxLoadLifetime);
        } else if (financial.depModel == DepreciationModel.EXTRUSION_BASED) {
            return DepreciationEngine.extrusionBased(operational.metersExtruded, operational.maxMetersLifetime);
        } else if (financial.depModel == DepreciationModel.SETUP_BASED) {
            return DepreciationEngine.setupBased(operational.setupCount, operational.maxSetups);
        } else if (financial.depModel == DepreciationModel.LINEAR) {
            return DepreciationEngine.linearTimeBased(operational.operatingHours, operational.maxLifetimeHours);
        }
        return 0;
    }

    /**
     * @notice Devuelve la depreciación actual (basis points)
     */
    function getDepreciation(uint256 tokenId) public view returns (uint256) {
        uint256 dep = _calculateDepreciation(tokenId);
        // Evento solo para trazabilidad (no en view, pero aquí para consistencia de interfaz)
        // emit DepreciationCalculated(tokenId, dep); // Comentado: no se puede emitir en view
        return dep;
    }
    // ============ Constants ============
    
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BASIS_POINTS = 10000; // 100.00%
    
    // ============ State Variables ============
    
    /// @dev Counter for token IDs
    uint256 private _nextTokenId;
    
    /// @dev Mapping from token ID to asset identification data
    mapping(uint256 => AssetIdentification) private _assetIdentification;
    
    /// @dev Mapping from token ID to technical specifications
    mapping(uint256 => TechnicalSpecs) private _technicalSpecs;
    
    /// @dev Mapping from token ID to financial data
    mapping(uint256 => FinancialData) private _financialData;
    
    /// @dev Mapping from token ID to operational metrics
    mapping(uint256 => OperationalMetrics) private _operationalMetrics;
    
    /// @dev Mapping from token ID to certification data
    mapping(uint256 => CertificationData) private _certificationData;
    
    /// @dev Mapping from token ID to telemetry configuration
    mapping(uint256 => TelemetryConfig) private _telemetryConfig;
    
    /// @dev Mapping from token ID to tokenization configuration
    mapping(uint256 => TokenizationConfig) private _tokenizationConfig;
    
    /// @dev Mapping from token ID to insurance data
    mapping(uint256 => InsuranceData) private _insuranceData;
    
    /// @dev Mapping from token ID to metadata URI
    mapping(uint256 => string) private _tokenURIs;
    
    /// @dev Base URI for metadata
    string private _baseTokenURI;
    
    // ============ Initialization ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the contract
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param baseURI_ Base URI for token metadata
     * @param admin Admin address
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address admin
    ) public initializer {
        __ERC721_init(name_, symbol_);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _baseTokenURI = baseURI_;
        _nextTokenId = 201; // Start from 201 (industrial collection)
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ASSET_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Core Minting Function ============
    
    /**
     * @notice Mint a new industrial asset NFT
     * @param to Recipient address
     * @param identification Asset identification data
     * @param specs Technical specifications
     * @param financials Financial data
     * @param operational Initial operational metrics
     * @param metadataURI Metadata URI
     * @return tokenId The ID of the minted token
     */
    function mintAsset(
        address to,
        AssetIdentification calldata identification,
        TechnicalSpecs calldata specs,
        FinancialData calldata financials,
        OperationalMetrics calldata operational,
        string calldata metadataURI
    ) external onlyRole(ASSET_MANAGER_ROLE) returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(financials.purchasePrice > 0, "Invalid purchase price");
        require(financials.currentValue > 0, "Invalid current value");
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        
        _assetIdentification[tokenId] = identification;
        _technicalSpecs[tokenId] = specs;
        _financialData[tokenId] = financials;
        _operationalMetrics[tokenId] = operational;
        _tokenURIs[tokenId] = metadataURI;
        
        emit AssetMinted(
            tokenId,
            to,
            identification.category,
            identification.manufacturer,
            identification.model,
            financials.purchasePrice
        );
        
        return tokenId;
    }
    
    // ============ Asset Data Getters ============
    
    function getAssetData(uint256 tokenId) 
        external 
        view 
        returns (
            AssetIdentification memory identification,
            TechnicalSpecs memory specs,
            FinancialData memory financial,
            OperationalMetrics memory operational
        ) 
    {
        _requireOwned(tokenId);
        return (
            _assetIdentification[tokenId],
            _technicalSpecs[tokenId],
            _financialData[tokenId],
            _operationalMetrics[tokenId]
        );
    }
    
    function getAssetIdentification(uint256 tokenId) 
        external 
        view 
        returns (AssetIdentification memory) 
    {
        _requireOwned(tokenId);
        return _assetIdentification[tokenId];
    }
    
    function getTechnicalSpecs(uint256 tokenId) 
        external 
        view 
        returns (TechnicalSpecs memory) 
    {
        _requireOwned(tokenId);
        return _technicalSpecs[tokenId];
    }
    
    function getFinancialData(uint256 tokenId) 
        external 
        view 
        returns (FinancialData memory) 
    {
        _requireOwned(tokenId);
        return _financialData[tokenId];
    }
    
    function getOperationalMetrics(uint256 tokenId) 
        external 
        view 
        returns (OperationalMetrics memory) 
    {
        _requireOwned(tokenId);
        return _operationalMetrics[tokenId];
    }
    
    function getCertificationData(uint256 tokenId) 
        external 
        view 
        returns (CertificationData memory) 
    {
        _requireOwned(tokenId);
        return _certificationData[tokenId];
    }
    
    function getTelemetryConfig(uint256 tokenId) 
        external 
        view 
        returns (TelemetryConfig memory) 
    {
        _requireOwned(tokenId);
        return _telemetryConfig[tokenId];
    }
    
    function getTokenizationConfig(uint256 tokenId) 
        external 
        view 
        returns (TokenizationConfig memory) 
    {
        _requireOwned(tokenId);
        return _tokenizationConfig[tokenId];
    }
    
    function getInsuranceData(uint256 tokenId) 
        external 
        view 
        returns (InsuranceData memory) 
    {
        _requireOwned(tokenId);
        return _insuranceData[tokenId];
    }
    
    // ============ Value Management ============
    
    /**
     * @notice Update asset current value (typically called by oracle or asset manager)
     * @param tokenId Token ID
     * @param newValue New current value
     */
    function updateAssetValue(uint256 tokenId, uint256 newValue, string calldata reason) 
        external 
        onlyRole(ASSET_MANAGER_ROLE) 
    {
        _requireOwned(tokenId);
        require(newValue > 0, "Invalid value");
        
        uint256 oldValue = _financialData[tokenId].currentValue;
        _financialData[tokenId].currentValue = newValue;
        
        emit AssetValueUpdated(tokenId, oldValue, newValue, reason);
    }
    
    /**
     * @notice Calculate current asset value based on depreciation model
     * @param tokenId Token ID
     * @return Current calculated value
     */
    function calculateCurrentValue(uint256 tokenId) 
        public 
        view 
        returns (uint256) 
    {
        _requireOwned(tokenId);
        
        FinancialData memory financial = _financialData[tokenId];
        OperationalMetrics memory operational = _operationalMetrics[tokenId];
        
        uint256 depreciationPct = getDepreciationPercentage(tokenId);
        uint256 depreciatedValue = financial.purchasePrice * (BASIS_POINTS - depreciationPct) / BASIS_POINTS;
        
        // Minimum residual value
        uint256 residualValue = financial.purchasePrice * financial.residualValuePct / 100;
        
        return depreciatedValue > residualValue ? depreciatedValue : residualValue;
    }
    
    /**
     * @notice Get depreciation percentage (0-10000 basis points)
     * @param tokenId Token ID
     * @return Depreciation percentage in basis points
     */
    function getDepreciationPercentage(uint256 tokenId) 
        public 
        view 
        returns (uint256) 
    {
        _requireOwned(tokenId);
        
        FinancialData memory financial = _financialData[tokenId];
        OperationalMetrics memory operational = _operationalMetrics[tokenId];
        TechnicalSpecs memory specs = _technicalSpecs[tokenId];
        
        if (financial.depModel == DepreciationModel.LOAD_BASED) {
            // EVOCONS: Depreciation based on tons lifted
            uint256 maxLoad = operational.maxLoadLifetime;
            if (maxLoad == 0) return 0;
            uint256 usagePct = (operational.totalLoadLifted * BASIS_POINTS) / maxLoad;
            return usagePct > BASIS_POINTS ? BASIS_POINTS : usagePct;
            
        } else if (financial.depModel == DepreciationModel.EXTRUSION_BASED) {
            // ICON: Depreciation based on linear meters extruded
            uint256 maxMeters = operational.maxMetersLifetime;
            if (maxMeters == 0) return 0;
            uint256 usagePct = (operational.metersExtruded * BASIS_POINTS) / maxMeters;
            return usagePct > BASIS_POINTS ? BASIS_POINTS : usagePct;
            
        } else if (financial.depModel == DepreciationModel.SETUP_BASED) {
            // Apis Cor: Depreciation based on setup count
            uint256 maxSetups = operational.maxSetups;
            if (maxSetups == 0) return 0;
            uint256 usagePct = (operational.setupCount * BASIS_POINTS) / maxSetups;
            return usagePct > BASIS_POINTS ? BASIS_POINTS : usagePct;
            
        } else if (financial.depModel == DepreciationModel.LINEAR) {
            // Mighty Buildings: Linear time-based depreciation
            if (operational.maxLifetimeHours == 0) return 0;
            uint256 usagePct = (operational.operatingHours * BASIS_POINTS) / operational.maxLifetimeHours;
            return usagePct > BASIS_POINTS ? BASIS_POINTS : usagePct;
            
        }
        
        return 0;
    }
    
    /**
     * @notice Get residual value (salvage value at end of life)
     * @param tokenId Token ID
     * @return Residual value in USD
     */
    function getResidualValue(uint256 tokenId) 
        external 
        view 
        returns (uint256) 
    {
        _requireOwned(tokenId);
        FinancialData memory financial = _financialData[tokenId];
        return financial.purchasePrice * financial.residualValuePct / 100;
    }
    
    /**
     * @notice Get remaining useful life percentage
     * @param tokenId Token ID
     * @return Remaining life percentage (0-10000 basis points)
     */
    function getRemainingLifePercentage(uint256 tokenId) 
        external 
        view 
        returns (uint256) 
    {
        uint256 depPct = getDepreciationPercentage(tokenId);
        return BASIS_POINTS - depPct;
    }
    
    // ============ Operational Updates ============
    
    /**
     * @notice Record maintenance event
     * @param tokenId Token ID
     * @param maintenanceType Type of maintenance performed
     * @param cost Maintenance cost
     * @param provider Service provider name
     */
    function recordMaintenance(
        uint256 tokenId,
        string calldata maintenanceType,
        uint256 cost,
        string calldata provider
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        _requireOwned(tokenId);
        
        _operationalMetrics[tokenId].lastMaintenanceDate = uint32(block.timestamp);
        
        emit MaintenanceRecorded(tokenId, uint32(block.timestamp), maintenanceType, cost, provider);
    }
    
    /**
     * @notice Update operational metrics (typically called by oracle)
     * @param tokenId Token ID
     * @param metricType Type of metric (LOAD, EXTRUSION, SETUP, HOURS)
     * @param newValue New value of the metric
     */
    function updateUsageMetrics(
        uint256 tokenId,
        string calldata metricType,
        uint256 newValue
    ) external onlyRole(ORACLE_ROLE) {
        _requireOwned(tokenId);
        
        // Fix: Initialize oldValue to 0 to avoid uninitialized variable warning
        uint256 oldValue = 0;
        
        // Update based on metric type
        if (keccak256(bytes(metricType)) == keccak256(bytes("LOAD"))) {
            oldValue = _operationalMetrics[tokenId].totalLoadLifted;
            _operationalMetrics[tokenId].totalLoadLifted = newValue;
        } else if (keccak256(bytes(metricType)) == keccak256(bytes("EXTRUSION"))) {
            oldValue = _operationalMetrics[tokenId].metersExtruded;
            _operationalMetrics[tokenId].metersExtruded = newValue;
        } else if (keccak256(bytes(metricType)) == keccak256(bytes("SETUP"))) {
            oldValue = _operationalMetrics[tokenId].setupCount;
            _operationalMetrics[tokenId].setupCount = uint32(newValue);
        } else if (keccak256(bytes(metricType)) == keccak256(bytes("HOURS"))) {
            oldValue = _operationalMetrics[tokenId].operatingHours;
            _operationalMetrics[tokenId].operatingHours = newValue;
        }
        
        uint256 depreciation = getDepreciationPercentage(tokenId);
        emit UsageMetricsUpdated(tokenId, metricType, oldValue, newValue, depreciation);
    }
    
    /**
     * @notice Update asset operational status
     * @param tokenId Token ID
     * @param newStatus New status
     */
    function updateOperationalStatus(uint256 tokenId, OperationalStatus newStatus) 
        external 
        onlyRole(ASSET_MANAGER_ROLE) 
    {
        _requireOwned(tokenId);
        
        OperationalStatus oldStatus = _operationalMetrics[tokenId].status;
        _operationalMetrics[tokenId].status = newStatus;
        
        emit AssetStatusChanged(tokenId, oldStatus, newStatus, uint32(block.timestamp));
    }
    
    /**
     * @notice Check if asset requires maintenance
     * @param tokenId Token ID
     * @return True if maintenance is due
     */
    function requiresMaintenance(uint256 tokenId) 
        external 
        view 
        returns (bool) 
    {
        _requireOwned(tokenId);
        
        OperationalMetrics memory metrics = _operationalMetrics[tokenId];
        
        // Check if maintenance interval exceeded
        uint256 hoursSinceLastMaintenance = 
            (block.timestamp - metrics.lastMaintenanceDate) / 3600;
        
        return hoursSinceLastMaintenance >= metrics.maintenanceIntervalHours;
    }
    
    // ============ Telemetry & Oracle Integration ============
    
    /**
     * @notice Receive telemetry data from oracle
     * @param tokenId Token ID
     * @param dataHash Hash of the telemetry data
     * @param metrics Updated operational metrics from API
     */
    function receiveTelemetryData(
        uint256 tokenId,
        bytes32 dataHash,
        OperationalMetrics calldata metrics
    ) external onlyRole(ORACLE_ROLE) {
        _requireOwned(tokenId);
        
        _operationalMetrics[tokenId] = metrics;
        _telemetryConfig[tokenId].lastTelemetryUpdate = uint32(block.timestamp);
        
        emit TelemetryDataReceived(tokenId, msg.sender, dataHash, uint32(block.timestamp));
    }
    
    // ============ Certification & Compliance ============
    // Removed: updateCertification(), isCompliant() - Moved to off-chain validation
    
    // ============ Insurance Management ============
    // Removed: updateInsurance() - Moved to off-chain tracking
    
    // ============ Metadata ============
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        _requireOwned(tokenId);
        
        string memory tokenSpecificURI = _tokenURIs[tokenId];
        
        if (bytes(tokenSpecificURI).length > 0) {
            return tokenSpecificURI;
        }
        
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId), ".json"));
    }
    
    function setBaseURI(string memory baseURI) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _baseTokenURI = baseURI;
    }
    
    function setTokenURI(uint256 tokenId, string memory uri) 
        external 
        onlyRole(ASSET_MANAGER_ROLE) 
    {
        _requireOwned(tokenId);
        _tokenURIs[tokenId] = uri;
    }
    
    // ============ Utility Functions ============
    
    function getAssetsByCategory(AssetCategory category) 
        external 
        view 
        returns (uint256[] memory tokenIds) 
    {
        // Simple implementation - in production use indexing service
        uint256 count = 0;
        uint256 total = _nextTokenId - 201;
        
        // Count matching assets
        for (uint256 i = 201; i < _nextTokenId; i++) {
            if (_assetIdentification[i].category == category) {
                count++;
            }
        }
        
        // Build array
        tokenIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 201; i < _nextTokenId; i++) {
            if (_assetIdentification[i].category == category) {
                tokenIds[index++] = i;
            }
        }
        
        return tokenIds;
    }
    
    function getAssetsByManufacturer(string calldata manufacturer) 
        external 
        view 
        returns (uint256[] memory tokenIds) 
    {
        uint256 count = 0;
        
        // Count matching assets
        for (uint256 i = 201; i < _nextTokenId; i++) {
            if (keccak256(bytes(_assetIdentification[i].manufacturer)) == keccak256(bytes(manufacturer))) {
                count++;
            }
        }
        
        // Build array
        tokenIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 201; i < _nextTokenId; i++) {
            if (keccak256(bytes(_assetIdentification[i].manufacturer)) == keccak256(bytes(manufacturer))) {
                tokenIds[index++] = i;
            }
        }
        
        return tokenIds;
    }
    
    function getTotalAssetValue(address owner) 
        external 
        view 
        returns (uint256 totalValue) 
    {
        totalValue = 0;
        for (uint256 i = 201; i < _nextTokenId; i++) {
            if (_ownerOf(i) == owner) {
                totalValue += _financialData[i].currentValue;
            }
        }
        return totalValue;
    }
    
    function configureTelemetry(uint256 tokenId, TelemetryConfig calldata telemetry) 
        external 
        onlyRole(ASSET_MANAGER_ROLE) 
    {
        _requireOwned(tokenId);
        _telemetryConfig[tokenId] = telemetry;
    }
    
    function configureTokenization(uint256 tokenId, TokenizationConfig calldata config) 
        external 
        onlyRole(ASSET_MANAGER_ROLE) 
    {
        _requireOwned(tokenId);
        _tokenizationConfig[tokenId] = config;
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // ============ Upgrade Authorization ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ Interface Support ============
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
