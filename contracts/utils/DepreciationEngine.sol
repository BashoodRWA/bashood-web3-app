// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../standards/IBashoodRWA.sol";

/// @title DepreciationEngine
/// @notice Lógica matemática para todos los modelos de depreciación BASHOOD-RWA-1
/// @dev Todas las funciones devuelven basis points (1% = 100, 100% = 10,000)
library DepreciationEngine {
        // Consolidated depreciation calculation
        function calculateDepreciation(uint8 depModel, IBashoodRWA.OperationalMetrics memory operational) internal pure returns (uint256) {
            if (depModel == uint8(IBashoodRWA.DepreciationModel.LOAD_BASED)) {
                return loadBased(operational.totalLoadLifted, operational.maxLoadLifetime);
            } else if (depModel == uint8(IBashoodRWA.DepreciationModel.EXTRUSION_BASED)) {
                return extrusionBased(operational.metersExtruded, operational.maxMetersLifetime);
            } else if (depModel == uint8(IBashoodRWA.DepreciationModel.SETUP_BASED)) {
                return setupBased(operational.setupCount, operational.maxSetups);
            } else if (depModel == uint8(IBashoodRWA.DepreciationModel.LINEAR)) {
                return linearTimeBased(operational.operatingHours, operational.maxLifetimeHours);
            }
            return 0;
        }
    error InvalidReferenceValue(string);

    // 1. LOAD_BASED
    function loadBased(uint256 totalLoadLifted, uint256 maxLoadCapacity) internal pure returns (uint256) {
        if (maxLoadCapacity == 0) revert InvalidReferenceValue("maxLoadCapacity");
        if (totalLoadLifted >= maxLoadCapacity) return 10_000;
        return (totalLoadLifted * 10_000) / maxLoadCapacity;
    }

    // 2. EXTRUSION_BASED
    function extrusionBased(uint256 metersExtruded, uint256 maxMetersExtruded) internal pure returns (uint256) {
        if (maxMetersExtruded == 0) revert InvalidReferenceValue("maxMetersExtruded");
        if (metersExtruded >= maxMetersExtruded) return 10_000;
        return (metersExtruded * 10_000) / maxMetersExtruded;
    }

    // 3. SETUP_BASED
    function setupBased(uint256 setupCount, uint256 maxSetups) internal pure returns (uint256) {
        if (maxSetups == 0) revert InvalidReferenceValue("maxSetups");
        if (setupCount >= maxSetups) return 10_000;
        return (setupCount * 10_000) / maxSetups;
    }

    // 4. EFFICIENCY_BASED
    function efficiencyBased(uint256 currentEfficiency, uint256 baselineEfficiency) internal pure returns (uint256) {
        if (baselineEfficiency == 0) revert InvalidReferenceValue("baselineEfficiency");
        if (currentEfficiency >= baselineEfficiency) return 0;
        return ((baselineEfficiency - currentEfficiency) * 10_000) / baselineEfficiency;
    }

    // 5. LINEAR (TIME-BASED)
    function linearTimeBased(uint256 operatingHours, uint256 maxLifetimeHours) internal pure returns (uint256) {
        if (maxLifetimeHours == 0) revert InvalidReferenceValue("maxLifetimeHours");
        if (operatingHours >= maxLifetimeHours) return 10_000;
        return (operatingHours * 10_000) / maxLifetimeHours;
    }

    // 6. TIME_BASED (AGE)
    function timeBasedAge(uint256 currentAge, uint256 annualDepreciationRate) internal pure returns (uint256) {
        if (annualDepreciationRate == 0) revert InvalidReferenceValue("annualDepreciationRate");
        if (currentAge == 0) return 0;
        uint256 depreciation = currentAge * annualDepreciationRate;
        if (depreciation >= 10_000) return 10_000;
        return depreciation;
    }
}
