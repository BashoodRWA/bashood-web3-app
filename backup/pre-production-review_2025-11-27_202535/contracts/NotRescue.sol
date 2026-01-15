// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract NotRescue is IERC165 {
    function supportsInterface(bytes4) external pure override returns (bool) {
        return false;
    }
}
