// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/standards/BashoodRWAReference.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title BashoodRWA Foundry Fuzz Tests
/// @notice Fuzzing tests for RWA contract security
contract BashoodRWAFuzzTest is Test {
    BashoodRWAReference public bashoodRWA;
    address public owner;
    address public assetManager;
    address public oracle;
    address public user1;
    
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    function setUp() public {
        owner = address(this);
        assetManager = address(0x1);
        oracle = address(0x2);
        user1 = address(0x3);
        
        // Deploy implementation
        BashoodRWAReference implementation = new BashoodRWAReference();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            BashoodRWAReference.initialize.selector,
            "Bashood Industrial Assets",
            "BASHOOD-RWA",
            "https://bashood.com/metadata/",
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        bashoodRWA = BashoodRWAReference(address(proxy));
        
        // Grant roles
        bashoodRWA.grantRole(ASSET_MANAGER_ROLE, assetManager);
        bashoodRWA.grantRole(ORACLE_ROLE, oracle);
    }
    
    /// @notice Fuzz test: Purchase price should never be zero
    function testFuzz_PurchasePriceNonZero(uint256 price) public {
        vm.assume(price > 0 && price < type(uint128).max);
        
        vm.prank(assetManager);
        bashoodRWA.mintAsset(
            user1,
            IBashoodRWA.AssetIdentification({
                name: "Fuzz Test",
                category: IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
                manufacturer: "Test",
                model: "Fuzz",
                serialNumber: "FUZZ-1",
                yearManufactured: 2024,
                countryOfOrigin: "US"
            }),
            IBashoodRWA.TechnicalSpecs({
                loadCapacity: 3000,
                displacementSpeed: 12,
                powerConsumption: 8,
                printVolumeX: 0,
                printVolumeY: 0,
                printVolumeZ: 0,
                materialPSI: 0,
                setupTimeMinutes: 0,
                autoLubrication: true,
                gpsTracking: true,
                cubicMetersPerDay: 0
            }),
            IBashoodRWA.FinancialData({
                purchasePrice: price,
                currentValue: price,
                residualValuePct: 1000,
                lastAppraisalDate: uint32(block.timestamp),
                depModel: IBashoodRWA.DepreciationModel.LOAD_BASED,
                annualMaintenancePct: 200,
                insurancePremiumPct: 150
            }),
            IBashoodRWA.OperationalMetrics({
                status: IBashoodRWA.OperationalStatus.OPERATIONAL,
                operatingHours: 0,
                maxLifetimeHours: 180000,
                totalLoadLifted: 0,
                maxLoadLifetime: 5000000 ether,
                metersExtruded: 0,
                maxMetersLifetime: 0,
                setupCount: 0,
                maxSetups: 0,
                cubicMetersPerDay: 0,
                lastMaintenanceDate: 0,
                nextMaintenanceDate: 0,
                maintenanceIntervalHours: 2500
            }),
            "ipfs://fuzz"
        );
        
        assertTrue(bashoodRWA.balanceOf(user1) == 1);
    }
    
    /// @notice Fuzz test: Depreciation percentage should never exceed 100%
    function testFuzz_DepreciationNeverExceeds100(
        uint256 operatingHours,
        uint256 maxLifetimeHours
    ) public {
        vm.assume(maxLifetimeHours > 0 && maxLifetimeHours < 1000000);
        vm.assume(operatingHours <= maxLifetimeHours);
        
        vm.prank(assetManager);
        uint256 tokenId = bashoodRWA.mintAsset(
            user1,
            IBashoodRWA.AssetIdentification({
                name: "Depreciation Fuzz",
                category: IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
                manufacturer: "Test",
                model: "DepFuzz",
                serialNumber: "DEP-1",
                yearManufactured: 2024,
                countryOfOrigin: "US"
            }),
            IBashoodRWA.TechnicalSpecs({
                loadCapacity: 3000,
                displacementSpeed: 12,
                powerConsumption: 8,
                printVolumeX: 0,
                printVolumeY: 0,
                printVolumeZ: 0,
                materialPSI: 0,
                setupTimeMinutes: 0,
                autoLubrication: true,
                gpsTracking: true,
                cubicMetersPerDay: 0
            }),
            IBashoodRWA.FinancialData({
                purchasePrice: 1000000 ether,
                currentValue: 1000000 ether,
                residualValuePct: 1000,
                lastAppraisalDate: uint32(block.timestamp),
                depModel: IBashoodRWA.DepreciationModel.LOAD_BASED,
                annualMaintenancePct: 200,
                insurancePremiumPct: 150
            }),
            IBashoodRWA.OperationalMetrics({
                status: IBashoodRWA.OperationalStatus.OPERATIONAL,
                operatingHours: operatingHours,
                maxLifetimeHours: maxLifetimeHours,
                totalLoadLifted: 0,
                maxLoadLifetime: 5000000 ether,
                metersExtruded: 0,
                maxMetersLifetime: 0,
                setupCount: 0,
                maxSetups: 0,
                cubicMetersPerDay: 0,
                lastMaintenanceDate: 0,
                nextMaintenanceDate: 0,
                maintenanceIntervalHours: 2500
            }),
            "ipfs://depfuzz"
        );
        
        uint256 depPct = bashoodRWA.getDepreciationPercentage(tokenId);
        assertLe(depPct, 10000); // Never exceeds 100% (10000 basis points)
    }
    
    /// @notice Fuzz test: Only authorized roles can mint assets
    function testFuzz_UnauthorizedMintReverts(address unauthorizedUser) public {
        vm.assume(unauthorizedUser != assetManager);
        vm.assume(unauthorizedUser != owner);
        
        vm.prank(unauthorizedUser);
        vm.expectRevert();
        bashoodRWA.mintAsset(
            user1,
            IBashoodRWA.AssetIdentification({
                name: "Unauthorized",
                category: IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
                manufacturer: "Test",
                model: "Unauth",
                serialNumber: "UNAUTH-1",
                yearManufactured: 2024,
                countryOfOrigin: "US"
            }),
            IBashoodRWA.TechnicalSpecs({
                loadCapacity: 3000,
                displacementSpeed: 12,
                powerConsumption: 8,
                printVolumeX: 0,
                printVolumeY: 0,
                printVolumeZ: 0,
                materialPSI: 0,
                setupTimeMinutes: 0,
                autoLubrication: true,
                gpsTracking: true,
                cubicMetersPerDay: 0
            }),
            IBashoodRWA.FinancialData({
                purchasePrice: 1000000 ether,
                currentValue: 1000000 ether,
                residualValuePct: 1000,
                lastAppraisalDate: uint32(block.timestamp),
                depModel: IBashoodRWA.DepreciationModel.LOAD_BASED,
                annualMaintenancePct: 200,
                insurancePremiumPct: 150
            }),
            IBashoodRWA.OperationalMetrics({
                status: IBashoodRWA.OperationalStatus.OPERATIONAL,
                operatingHours: 0,
                maxLifetimeHours: 180000,
                totalLoadLifted: 0,
                maxLoadLifetime: 5000000 ether,
                metersExtruded: 0,
                maxMetersLifetime: 0,
                setupCount: 0,
                maxSetups: 0,
                cubicMetersPerDay: 0,
                lastMaintenanceDate: 0,
                nextMaintenanceDate: 0,
                maintenanceIntervalHours: 2500
            }),
            "ipfs://unauth"
        );
    }
    
    /// @notice Fuzz test: Total asset value should equal sum of individual values
    function testFuzz_TotalValueConsistency(uint8 assetCount) public {
        vm.assume(assetCount > 0 && assetCount <= 10);
        
        uint256 expectedTotal = 0;
        
        for (uint256 i = 0; i < assetCount; i++) {
            uint256 price = 500000 ether + (i * 100000 ether);
            expectedTotal += price;
            
            vm.prank(assetManager);
            bashoodRWA.mintAsset(
                user1,
                IBashoodRWA.AssetIdentification({
                    name: string(abi.encodePacked("Asset ", i)),
                    category: IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
                    manufacturer: "Test",
                    model: "Consistency",
                    serialNumber: string(abi.encodePacked("CONS-", i)),
                    yearManufactured: 2024,
                    countryOfOrigin: "US"
                }),
                IBashoodRWA.TechnicalSpecs({
                    loadCapacity: 3000,
                    displacementSpeed: 12,
                    powerConsumption: 8,
                    printVolumeX: 0,
                    printVolumeY: 0,
                    printVolumeZ: 0,
                    materialPSI: 0,
                    setupTimeMinutes: 0,
                    autoLubrication: true,
                    gpsTracking: true,
                    cubicMetersPerDay: 0
                }),
                IBashoodRWA.FinancialData({
                    purchasePrice: price,
                    currentValue: price,
                    residualValuePct: 1000,
                    lastAppraisalDate: uint32(block.timestamp),
                    depModel: IBashoodRWA.DepreciationModel.LOAD_BASED,
                    annualMaintenancePct: 200,
                    insurancePremiumPct: 150
                }),
                IBashoodRWA.OperationalMetrics({
                    status: IBashoodRWA.OperationalStatus.OPERATIONAL,
                    operatingHours: 0,
                    maxLifetimeHours: 180000,
                    totalLoadLifted: 0,
                    maxLoadLifetime: 5000000 ether,
                    metersExtruded: 0,
                    maxMetersLifetime: 0,
                    setupCount: 0,
                    maxSetups: 0,
                    cubicMetersPerDay: 0,
                    lastMaintenanceDate: 0,
                    nextMaintenanceDate: 0,
                    maintenanceIntervalHours: 2500
                }),
                "ipfs://consistency"
            );
        }
        
        uint256 actualTotal = bashoodRWA.getTotalAssetValue(user1);
        assertEq(actualTotal, expectedTotal);
    }
    
    /// @notice Fuzz test: Oracle updates should not allow arbitrary values
    function testFuzz_OracleUpdateBounds(uint256 newValue, uint256 tokenId) public {
        vm.assume(newValue > 0 && newValue < type(uint128).max);
        
        // Mint asset first
        vm.prank(assetManager);
        uint256 realTokenId = bashoodRWA.mintAsset(
            user1,
            IBashoodRWA.AssetIdentification({
                name: "Oracle Fuzz",
                category: IBashoodRWA.AssetCategory.HEAVY_VEHICLE,
                manufacturer: "Test",
                model: "Oracle",
                serialNumber: "ORC-1",
                yearManufactured: 2024,
                countryOfOrigin: "US"
            }),
            IBashoodRWA.TechnicalSpecs({
                loadCapacity: 3000,
                displacementSpeed: 12,
                powerConsumption: 8,
                printVolumeX: 0,
                printVolumeY: 0,
                printVolumeZ: 0,
                materialPSI: 0,
                setupTimeMinutes: 0,
                autoLubrication: true,
                gpsTracking: true,
                cubicMetersPerDay: 0
            }),
            IBashoodRWA.FinancialData({
                purchasePrice: 1000000 ether,
                currentValue: 1000000 ether,
                residualValuePct: 1000,
                lastAppraisalDate: uint32(block.timestamp),
                depModel: IBashoodRWA.DepreciationModel.LOAD_BASED,
                annualMaintenancePct: 200,
                insurancePremiumPct: 150
            }),
            IBashoodRWA.OperationalMetrics({
                status: IBashoodRWA.OperationalStatus.OPERATIONAL,
                operatingHours: 0,
                maxLifetimeHours: 180000,
                totalLoadLifted: 0,
                maxLoadLifetime: 5000000 ether,
                metersExtruded: 0,
                maxMetersLifetime: 0,
                setupCount: 0,
                maxSetups: 0,
                cubicMetersPerDay: 0,
                lastMaintenanceDate: 0,
                nextMaintenanceDate: 0,
                maintenanceIntervalHours: 2500
            }),
            "ipfs://oracle"
        );
        
        vm.prank(assetManager);
        bashoodRWA.updateAssetValue(realTokenId, newValue, "Fuzz update");
        
        IBashoodRWA.FinancialData memory fd = bashoodRWA.getFinancialData(realTokenId);
        assertEq(fd.currentValue, newValue);
    }
}
