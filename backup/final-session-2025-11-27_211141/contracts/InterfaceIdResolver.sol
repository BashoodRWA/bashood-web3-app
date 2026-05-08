// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IBashoodRescue.sol";

contract InterfaceIdResolver {
    function getIBashoodRescueId() external pure returns (bytes4) {
        return type(IBashoodRescue).interfaceId;
    }
}
