// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IBashoodRWA
 * @author Bashood Protocol
 * @notice Standard interface for Real World Asset tokenization on Base L2
 * @dev This is the BASHOOD-RWA-1 standard for industrial assets
 * 
 * Based on research of 5 leading construction robotics companies:
 * - EVOCONS (Spain): Gantry systems, load-based depreciation
 * - ICON (USA): Lavacrete extrusion, API integration
 * - Apis Cor (USA/UAE): Mobile robots, GPS tracking, micro-leasing
 * - CyBe Construction (Netherlands): Fast-cure mortar, performance bonuses
 * - Mighty Buildings (USA): UV-cure panels, ESG tracking
 */
interface IBashoodRWA is IERC721 {
    
    // ==================== ENUMS ====================
    
    /// @notice Asset category based on real industrial classifications
    enum AssetCategory {
        CONSTRUCTION_3D_PRINTER_GANTRY,    // EVOCONS, ICON
        CONSTRUCTION_3D_PRINTER_MOBILE,    // Apis Cor, CyBe
        MODULAR_FACTORY_UV,                // Mighty Buildings
        HEAVY_VEHICLE,                     // Excavators, cranes
        ENERGY_EQUIPMENT,                  // Generators, transformers
        LOGISTICS_INFRASTRUCTURE,          // Containers, warehouses
        RAW_MATERIALS,                     // Metals, minerals
        REAL_ESTATE                        // Legacy support
    }
    
    /// @notice Depreciation models based on actual industry usage
    enum DepreciationModel {
        LOAD_BASED,        // EVOCONS: tons lifted (max 500k tons)
        EXTRUSION_BASED,   // ICON: meters of material (max varies)
        SETUP_BASED,       // Apis Cor: number of site setups
        TIME_BASED,        // Traditional: hours of operation
        EFFICIENCY_BASED,  // CyBe: m³ per day performance
        LINEAR             // Standard depreciation over time
    }
    
    /// @notice Operational status of the asset
    enum OperationalStatus {
        OPERATIONAL,       // Actively working
        MAINTENANCE,       // Under maintenance
        INACTIVE,          // Temporarily not in use
        DECOMMISSIONED     // End of life
    }
    
    /// @notice Tokenization strategies
    enum TokenizationStrategy {
        FULL_OWNERSHIP,    // Traditional NFT ownership
        FRACTIONAL,        // Multiple owners via shares
        MICRO_LEASING,     // Daily/weekly rentals (Apis Cor)
        PERFORMANCE_BOND,  // Bonuses for efficiency (CyBe)
        REVENUE_SHARE      // Income-based returns
    }
    
    // ==================== STRUCTS ====================
    
    /// @notice Core asset identification data
    struct AssetIdentification {
        string name;
        AssetCategory category;
        string manufacturer;       // e.g., "EVOCONS", "ICON"
        string model;              // e.g., "EVOBLOCK", "VULCAN"
        string serialNumber;
        uint16 yearManufactured;
        string countryOfOrigin;    // ISO 3166-1 alpha-2
    }
    
    /// @notice Technical specifications (varies by asset type)
    struct TechnicalSpecs {
        uint256 loadCapacity;        // kg (EVOCONS: 3000)
        uint256 displacementSpeed;   // m/min (EVOCONS: 40)
        uint256 powerConsumption;    // kW
        uint256 printVolumeX;        // meters (for 3D printers)
        uint256 printVolumeY;        // meters
        uint256 printVolumeZ;        // meters
        uint16 materialPSI;          // ICON Lavacrete: 6000
        uint16 setupTimeMinutes;     // Apis Cor: <60
        bool autoLubrication;        // EVOCONS feature
        bool gpsTracking;            // Apis Cor feature
        uint256 cubicMetersPerDay;   // Added field for production capacity
    }
    
    /// @notice Financial data with real-world depreciation
    struct FinancialData {
        uint256 purchasePrice;       // Original CAPEX in USD (scaled 1e18)
        uint256 currentValue;        // Current value in USD (scaled 1e18)
        uint256 residualValuePct;    // 10-25% salvage value at EOL
        uint32 lastAppraisalDate;    // Unix timestamp
        DepreciationModel depModel;
        uint16 annualMaintenancePct; // 2-3% of CAPEX typically
        uint16 insurancePremiumPct;  // 1-3% of CAPEX (1.5-2.5% for mobile)
    }
    
    /// @notice Operational metrics for depreciation calculation
    struct OperationalMetrics {
        OperationalStatus status;
        uint256 operatingHours;
        uint256 maxLifetimeHours;
        // Usage-specific metrics
        uint256 totalLoadLifted;     // EVOCONS: current/500k tons
        uint256 maxLoadLifetime;
        uint256 metersExtruded;      // ICON: meters of Lavacrete
        uint256 maxMetersLifetime;
        uint32 setupCount;           // Apis Cor: number of setups
        uint32 maxSetups;
        uint16 cubicMetersPerDay;    // CyBe: daily output
        uint32 lastMaintenanceDate;
        uint32 nextMaintenanceDate;
        uint16 maintenanceIntervalHours; // EVOCONS: 2500 hours
    }
    
    /// @notice Certifications required for compliance
    struct CertificationData {
        bool ceMark;                 // Required for EU (EVOCONS, CyBe)
        bool ul3401;                 // USA standard for 3D printed structures
        bool iso9001;                // Quality management
        bool iso14001;               // Environmental management
        bool ibcCompliant;           // International Building Code
        bool oshaCompliant;          // USA workplace safety
        string[] customCerts;        // Additional certifications
    }
    
    /// @notice Telemetry and API integration
    struct TelemetryConfig {
        bool hasRealTimeAPI;         // EVOCONS: true, ICON: true (private)
        address oracleAddress;       // Chainlink oracle for data feeds
        string apiProvider;          // "EVOCONS_REALTIME", "ICON_MAGWARE", etc.
        bytes32 apiKeyHash;          // Encrypted API key
        uint32 lastTelemetryUpdate;
    }
    
    /// @notice Tokenization configuration
    struct TokenizationConfig {
        TokenizationStrategy strategy;
        bool isFractional;
        uint256 totalShares;         // If fractional
        uint256 dailyLeaseRate;      // For MICRO_LEASING (Apis Cor)
        uint16 performanceBonusPct;  // For PERFORMANCE_BOND (CyBe)
        uint16 revenueSharePct;      // For REVENUE_SHARE
        uint256 maintenanceReservePct; // 5-8% of rental income
    }
    
    /// @notice Insurance data
    struct InsuranceData {
        string provider;             // "AXA", "Allianz", "FM Global"
        string policyNumber;
        uint256 coverageAmount;
        uint256 annualPremium;
        uint256 expiryDate;
    }
    
    // ==================== EVENTS ====================
    
    /// @notice Emitted when a new asset is tokenized
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed owner,
        AssetCategory category,
        string manufacturer,
        string model,
        uint256 purchasePrice
    );
    
    /// @notice Emitted when asset value is updated (via oracle or manual appraisal)
    event AssetValueUpdated(
        uint256 indexed tokenId,
        uint256 oldValue,
        uint256 newValue,
        string updateReason
    );
    
    /// @notice Emitted when operational status changes
    event AssetStatusChanged(
        uint256 indexed tokenId,
        OperationalStatus oldStatus,
        OperationalStatus newStatus,
        uint32 timestamp
    );
    
    /// @notice Emitted when maintenance is recorded
    event MaintenanceRecorded(
        uint256 indexed tokenId,
        uint32 date,
        string maintenanceType, // "PREVENTIVE", "CORRECTIVE", "MAJOR_OVERHAUL"
        uint256 cost,
        string provider
    );
    
    /// @notice Emitted when usage metrics are updated
    event UsageMetricsUpdated(
        uint256 indexed tokenId,
        string metricType,       // "LOAD", "EXTRUSION", "SETUP", "HOURS"
        uint256 oldValue,
        uint256 newValue,
        uint256 calculatedDepreciation
    );
    
    /// @notice Emitted when telemetry data is received from oracle
    event TelemetryDataReceived(
        uint256 indexed tokenId,
        address indexed oracle,
        bytes32 dataHash,
        uint32 timestamp
    );
    
    /// @notice Emitted when certification is added or expires
    event CertificationUpdated(
        uint256 indexed tokenId,
        string certificationType,
        bool isActive,
        uint32 expiryDate
    );
    
    /// @notice Emitted when insurance is updated
    event InsuranceUpdated(
        uint256 indexed tokenId,
        string provider,
        uint256 coverageAmount,
        uint32 expiryDate
    );
    
    /// @notice Emitted when performance bonus is triggered (CyBe)
    event PerformanceBonusTriggered(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 bonusAmount,
        string reason
    );
    
    /// @notice Emitted when asset is leased (micro-leasing)
    event AssetLeased(
        uint256 indexed tokenId,
        address indexed lessee,
        uint32 startDate,
        uint32 endDate,
        uint256 dailyRate,
        uint256 totalCost
    );
    
    // ==================== CORE FUNCTIONS ====================
    
    /// @notice Mint a new industrial asset NFT
    /// @param to Owner address
    /// @param identification Asset identification data
    /// @param specs Technical specifications
    /// @param financials Financial data
    /// @param operational Operational metrics
    /// @param metadataURI URI to full JSON metadata (BASHOOD-RWA-1 compliant)
    /// @return tokenId The newly minted token ID
    function mintAsset(
        address to,
        AssetIdentification calldata identification,
        TechnicalSpecs calldata specs,
        FinancialData calldata financials,
        OperationalMetrics calldata operational,
        string calldata metadataURI
    ) external returns (uint256 tokenId);
    
    /// @notice Get complete asset data
    /// @param tokenId Token ID to query
    /// @return identification Asset identification
    /// @return specs Technical specifications
    /// @return financials Financial data
    /// @return operational Operational metrics
    function getAssetData(uint256 tokenId) external view returns (
        AssetIdentification memory identification,
        TechnicalSpecs memory specs,
        FinancialData memory financials,
        OperationalMetrics memory operational
    );
    
    /// @notice Update asset value (manual or oracle-triggered)
    /// @param tokenId Token ID
    /// @param newValue New value in USD (scaled 1e18)
    /// @param reason Reason for update
    function updateAssetValue(uint256 tokenId, uint256 newValue, string calldata reason) external;
    
    /// @notice Record maintenance event
    /// @param tokenId Token ID
    /// @param maintenanceType "PREVENTIVE", "CORRECTIVE", "MAJOR_OVERHAUL"
    /// @param cost Cost in USD (scaled 1e18)
    /// @param provider Service provider name
    function recordMaintenance(
        uint256 tokenId,
        string calldata maintenanceType,
        uint256 cost,
        string calldata provider
    ) external;
    
    /// @notice Update usage metrics (e.g., operating hours, load lifted, meters extruded)
    /// @param tokenId Token ID
    /// @param metricType "HOURS", "LOAD", "EXTRUSION", "SETUP", "CUBIC_METERS"
    /// @param newValue New metric value
    function updateUsageMetrics(
        uint256 tokenId,
        string calldata metricType,
        uint256 newValue
    ) external;
    
    /// @notice Calculate current value based on depreciation model
    /// @param tokenId Token ID
    /// @return currentValue Calculated current value in USD (scaled 1e18)
    function calculateCurrentValue(uint256 tokenId) external view returns (uint256 currentValue);
    
    /// @notice Get depreciation percentage
    /// @param tokenId Token ID
    /// @return depreciationPct Percentage depreciated (0-100, scaled 1e2)
    function getDepreciationPercentage(uint256 tokenId) external view returns (uint256 depreciationPct);
    
    /// @notice Update operational status
    /// @param tokenId Token ID
    /// @param newStatus New operational status
    function updateOperationalStatus(uint256 tokenId, OperationalStatus newStatus) external;
    
    // ==================== CERTIFICATION FUNCTIONS ====================
    
    /// @notice Add or update certification
    /// @param tokenId Token ID
    /// @param certificationType Type of certification
    /// @param expiryDate Expiry date (unix timestamp)
    /// @param documentHash IPFS hash of certificate document
    // REMOVED FOR SIZE OPTIMIZATION - Moved to off-chain validation
    // function updateCertification(
    //     uint256 tokenId,
    //     string calldata certificationType,
    //     uint32 expiryDate,
    //     string calldata documentHash
    // ) external;
    
    /// @notice Check if asset is compliant with all required certifications
    /// @param tokenId Token ID
    /// @return isCompliant True if all required certs are valid
    // REMOVED FOR SIZE OPTIMIZATION - Moved to off-chain validation
    // function isCompliant(uint256 tokenId) external view returns (bool isCompliant);
    
    // ==================== TELEMETRY FUNCTIONS ====================
    
    /// @notice Configure telemetry integration
    /// @param tokenId Token ID
    /// @param config Telemetry configuration
    function configureTelemetry(uint256 tokenId, TelemetryConfig calldata config) external;
    
    /// @notice Receive telemetry data from oracle (Chainlink)
    /// @param tokenId Token ID
    /// @param dataHash Hash of telemetry data
    /// @param metrics Updated metrics from API
    function receiveTelemetryData(
        uint256 tokenId,
        bytes32 dataHash,
        OperationalMetrics calldata metrics
    ) external;
    
    // ==================== TOKENIZATION FUNCTIONS ====================
    
    /// @notice Configure tokenization strategy
    /// @param tokenId Token ID
    /// @param config Tokenization configuration
    function configureTokenization(uint256 tokenId, TokenizationConfig calldata config) external;
    
    /// @notice Lease asset (for MICRO_LEASING strategy)
    /// @param tokenId Token ID
    /// @param duration Number of days to lease
    /// @return leaseId Lease identifier
    // REMOVED FOR SIZE OPTIMIZATION - Tokenization strategy simplified
    // function leaseAsset(uint256 tokenId, uint32 duration) external payable returns (uint256 leaseId);
    
    /// @notice Trigger performance bonus (for PERFORMANCE_BOND strategy)
    /// @param tokenId Token ID
    /// @param achieved Actual performance achieved
    /// @param baseline Expected baseline performance
    // REMOVED FOR SIZE OPTIMIZATION - Tokenization strategy simplified
    // function triggerPerformanceBonus(
    //     uint256 tokenId,
    //     uint256 achieved,
    //     uint256 baseline
    // ) external;
    
    // ==================== INSURANCE FUNCTIONS ====================
    
    /// @notice Update insurance information
    /// @param tokenId Token ID
    /// @param provider Insurance provider
    /// @param coverageAmount Coverage amount
    /// @param annualPremium Annual premium
    /// @param expiryDate Policy expiry date
    // REMOVED FOR SIZE OPTIMIZATION - Moved to off-chain tracking
    // function updateInsurance(
    //     uint256 tokenId,
    //     string calldata provider,
    //     uint256 coverageAmount,
    //     uint256 annualPremium,
    //     uint32 expiryDate
    // ) external;
    
    // ==================== VIEW FUNCTIONS ====================
    
    /// @notice Get assets by category
    /// @param category Asset category to filter
    /// @return tokenIds Array of token IDs in that category
    function getAssetsByCategory(AssetCategory category) external view returns (uint256[] memory tokenIds);
    
    /// @notice Get assets by manufacturer
    /// @param manufacturer Manufacturer name
    /// @return tokenIds Array of token IDs from that manufacturer
    function getAssetsByManufacturer(string calldata manufacturer) external view returns (uint256[] memory tokenIds);
    
    /// @notice Get total value of all assets owned by an address
    /// @param owner Owner address
    /// @return totalValue Total value in USD (scaled 1e18)
    function getTotalAssetValue(address owner) external view returns (uint256 totalValue);
    
    /// @notice Check if asset requires maintenance
    /// @param tokenId Token ID
    /// @return requiresMaintenance True if next maintenance is overdue
    function requiresMaintenance(uint256 tokenId) external view returns (bool requiresMaintenance);
    
    /// @notice Get estimated residual value (salvage value at end of life)
    /// @param tokenId Token ID
    /// @return residualValue Estimated value in USD (scaled 1e18)
    function getResidualValue(uint256 tokenId) external view returns (uint256 residualValue);
    
    /// @notice Get remaining useful life percentage
    /// @param tokenId Token ID
    /// @return remainingLifePct Percentage of useful life remaining (0-100)
    function getRemainingLifePercentage(uint256 tokenId) external view returns (uint256 remainingLifePct);
}
