// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IBashoodRescue.sol";

/**
 * @title MockBadRescue
 * @dev Mock rescue contract that fails to test catch blocks
 * mode 1: reverts with Error(string)
 * mode 2: reverts without message (panic/assert)
 */
contract MockBadRescue is IBashoodRescue {
    uint8 public failMode;

    constructor(uint8 _failMode) {
        failMode = _failMode;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IBashoodRescue).interfaceId;
    }

    function rescueUnsoldNFTs(
        address,
        uint256,
        address,
        uint256
    ) external view {
        if (failMode == 1) {
            revert("MockBadRescue Error");
        } else if (failMode == 2) {
            assert(false); // Panic without message
        }
    }

    function rescueERC20(
        address,
        address,
        uint256
    ) external view {
        if (failMode == 1) {
            revert("MockBadRescue Error");
        } else if (failMode == 2) {
            assert(false);
        }
    }

    function emergencyWithdrawETH() external view {
        if (failMode == 1) {
            revert("MockBadRescue Error");
        } else if (failMode == 2) {
            assert(false);
        }
    }
}
