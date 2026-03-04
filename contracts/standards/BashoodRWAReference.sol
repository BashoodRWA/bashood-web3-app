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
    IBashoodRWA,
    ICoreForAggregator
{
    // ============ Enums ============
    // Uso interno: enum UsageMetricType { LOAD, EXTRUSION, SETUP, HOURS }
    // ============ Enums ============
    // ============ Enums ============
    enum UsageMetricType { LOAD, EXTRUSION, SETUP, HOURS }
    // ============ Constants ============
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BASIS_POINTS = 10000; // 100.00%

    // ============ State Variables ============
    uint256 private _nextTokenId;
    mapping(uint256 => AssetIdentification) private _assetIdentification;
    mapping(uint256 => TechnicalSpecs) private _technicalSpecs;
    mapping(uint256 => FinancialData) private _financialData;
    mapping(uint256 => OperationalMetrics) private _operationalMetrics;
    mapping(uint256 => CertificationData) private _certificationData;
    mapping(uint256 => TelemetryConfig) private _telemetryConfig;
    mapping(uint256 => TokenizationConfig) private _tokenizationConfig;
    mapping(uint256 => InsuranceData) private _insuranceData;
    mapping(uint256 => string) private _tokenURIs;
    string private _baseTokenURI;

    /**
     * @dev Storage gap para upgrades seguros (patrón OZ).
     *      Slots usados: 11 (_nextTokenId + 9 mappings + _baseTokenURI).
     *      Reserva: 50 slots adicionales. Reducir en 1 por cada nueva variable
     *      que se añada en una acción de upgrade.
     */
    uint256[50] private __gap;

    // ============ Initialization ============
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ...existing code...
    
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
        override(ICoreForAggregator)
        returns (OperationalMetrics memory) 
    {
        _requireOwned(tokenId);
        return _operationalMetrics[tokenId];
    }

    /**
     * @notice ownerOf explícito para resolver la herencia múltiple
     *         entre ERC721Upgradeable, IERC721 e ICoreForAggregator.
     */
    function ownerOf(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, IERC721, ICoreForAggregator)
        returns (address)
    {
        return super.ownerOf(tokenId);
    }
    
    /**
     * @notice Devuelve los flags de elegibilidad de certificación establecidos
     *         en el momento del mint del activo (estado inicial, inmutable).
     * @dev ATENCIóN: Este mapping nunca se escribe tras el mint.
     *      El estado de compliance VIGENTE y auditable vive en
     *      CertificationModule (M4-F3). No usar este getter para
     *      determinar si un activo está certificado actualmente.
     */
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
    
    /**
     * @notice Devuelve los datos de seguro establecidos en el momento del mint
     *         del activo (estado inicial, inmutable).
     * @dev ATENCIóN: Este mapping nunca se escribe tras el mint.
     *      El estado de la póliza VIGENTE y auditable vive en
     *      InsuranceModule (M4-F3). No usar este getter para
     *      determinar si un activo está asegurado actualmente.
     */
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
     * @notice Actualiza el valor de mercado actual del activo.
     *
     * ════════════════════════════════════════════════════════════════════
     * FUENTE DE VERDAD ECONÓMICA OFICIAL — Plan M4 / BASHOOD-RWA-1
     * ════════════════════════════════════════════════════════════════════
     *
     * `FinancialData.currentValue` es el único campo autoritativo del
     * valor de mercado de un activo on-chain. Toda lógica de valoración
     * (depreciación, oracle, tasación manual) converge en este campo.
     *
     * PROTOCOLO DE PRODUCCIÓN
     * ────────────────────────
     * · En producción, el único caller autorizado es OracleValuationModule
     *   (al que se otorga ASSET_MANAGER_ROLE). Las actualizaciones manuales
     *   directas al Core están PROHIBIDAS salvo emergencia documentada.
     * · Toda actualización debe incluir un `reason` auditable:
     *     - "ORACLE_REVALUATION"   → llamada de OracleValuationModule
     *     - "ADMIN_APPRAISAL"      → tasación manual de emergencia
     *     - "DEPRECIATION_UPDATE"  → ajuste manual por depreciación
     * · Emite `AssetValueUpdated` con oldValue/newValue/reason para
     *   trazabilidad completa por indexadores off-chain.
     *
     * INTEGRADORES: no llaméis a esta función directamente; usad
     * OracleValuationModule.pushValuation(tokenId) en su lugar.
     *
     * @param tokenId  ID del activo NFT.
     * @param newValue Nuevo valor en USD, escalado 1e18. Debe ser > 0.
     * @param reason   Cadena auditable del origen de la actualización.
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
        return DepreciationEngine.calculateDepreciation(uint8(financial.depModel), operational);
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
     * @param metricType Enum type of metric (LOAD, EXTRUSION, SETUP, HOURS)
     * @param newValue New value of the metric
     */
    function updateUsageMetrics(
        uint256 tokenId,
        string calldata metricType,
        uint256 newValue
    ) external onlyRole(ORACLE_ROLE) {
        _requireOwned(tokenId);
        uint256 oldValue = 0;
        // Internamente convertimos string a enum
        uint8 metricEnum = _metricTypeStringToEnum(metricType);
        if (metricEnum == 0) { // LOAD
            oldValue = _operationalMetrics[tokenId].totalLoadLifted;
            _operationalMetrics[tokenId].totalLoadLifted = newValue;
        } else if (metricEnum == 1) { // EXTRUSION
            oldValue = _operationalMetrics[tokenId].metersExtruded;
            _operationalMetrics[tokenId].metersExtruded = newValue;
        } else if (metricEnum == 2) { // SETUP
            oldValue = _operationalMetrics[tokenId].setupCount;
            _operationalMetrics[tokenId].setupCount = uint32(newValue);
        } else if (metricEnum == 3) { // HOURS
            oldValue = _operationalMetrics[tokenId].operatingHours;
            _operationalMetrics[tokenId].operatingHours = newValue;
        }
        uint256 depreciation = getDepreciationPercentage(tokenId);
        emit UsageMetricsUpdated(tokenId, metricType, oldValue, newValue, depreciation);
    }

    function _metricTypeStringToEnum(string calldata metricType) internal pure returns (uint8) {
        if (keccak256(bytes(metricType)) == keccak256(bytes("LOAD"))) return 0;
        if (keccak256(bytes(metricType)) == keccak256(bytes("EXTRUSION"))) return 1;
        if (keccak256(bytes(metricType)) == keccak256(bytes("SETUP"))) return 2;
        if (keccak256(bytes(metricType)) == keccak256(bytes("HOURS"))) return 3;
        return 255; // UNKNOWN
    }

    function _usageMetricTypeToString(UsageMetricType metricType) internal pure returns (string memory) {
        if (metricType == UsageMetricType.LOAD) return "LOAD";
        if (metricType == UsageMetricType.EXTRUSION) return "EXTRUSION";
        if (metricType == UsageMetricType.SETUP) return "SETUP";
        if (metricType == UsageMetricType.HOURS) return "HOURS";
        return "UNKNOWN";
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
    // updateCertification() e isCompliant() movidos a CertificationModule (M4-F3).
    // _certificationData existe en storage por compatibilidad del proxy UUPS;
    // su escritura y la lógica de compliance viven en CertificationModule.

    // ============ Insurance Management ============
    // updateInsurance() movido a InsuranceModule (M4-F3).
    // _insuranceData existe en storage por compatibilidad del proxy UUPS;
    // su escritura y la lógica de pólizas viven en InsuranceModule.
    
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
