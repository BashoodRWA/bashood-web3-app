// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/DepreciationEngine.sol";

contract DepreciationModelMock {
    // 1. LOAD_BASED
    function loadBased(uint256 totalLoadLifted, uint256 maxLoadLifetime) external pure returns (uint256) {
        return DepreciationEngine.loadBased(totalLoadLifted, maxLoadLifetime);
    }
    // 2. EXTRUSION_BASED
    function extrusionBased(uint256 metersExtruded, uint256 maxMetersLifetime) external pure returns (uint256) {
        return DepreciationEngine.extrusionBased(metersExtruded, maxMetersLifetime);
    }
    // 3. SETUP_BASED
    function setupBased(uint256 setupCount, uint256 maxSetups) external pure returns (uint256) {
        return DepreciationEngine.setupBased(setupCount, maxSetups);
    }
    // 4. LINEAR (TIME-BASED)
    function linearTimeBased(uint256 operatingHours, uint256 maxLifetimeHours) external pure returns (uint256) {
        return DepreciationEngine.linearTimeBased(operatingHours, maxLifetimeHours);
    }
    // 5. TIME_BASED (AGE)
    function timeBasedAge(uint256 currentAge, uint256 annualDepreciationRate) external pure returns (uint256) {
        return DepreciationEngine.timeBasedAge(currentAge, annualDepreciationRate);
    }
}
