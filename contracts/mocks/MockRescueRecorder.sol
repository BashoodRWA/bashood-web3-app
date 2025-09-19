// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IBashoodRescue.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MockRescueRecorder is ERC165, IBashoodRescue {
    uint256 public calls;
    event RescueCalled(address indexed caller, string method);

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IBashoodRescue).interfaceId || super.supportsInterface(interfaceId);
    }

    function rescueUnsoldNFTs(address, uint256, address, uint256) external override {
        calls += 1;
        emit RescueCalled(msg.sender, "rescueUnsoldNFTs");
    }

    function rescueERC20(address, address, uint256) external override {
        calls += 1;
        emit RescueCalled(msg.sender, "rescueERC20");
    }

    function emergencyWithdrawETH(address payable) external override {
        calls += 1;
        emit RescueCalled(msg.sender, "emergencyWithdrawETH");
    }
}
