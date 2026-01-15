// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Simple contract that rejects any plain ETH transfer to simulate project wallet transfer failures
contract RejectingWallet {
    receive() external payable {
        revert("no ETH accepted");
    }

    fallback() external payable {
        revert("no ETH accepted");
    }

    /// @notice Helper that calls withdrawFunds on a target contract so the call is made from this contract
    /// and any revert reason from the target is bubbled up to the caller
    function callWithdraw(address target) external {
        (bool ok, bytes memory data) = target.call(abi.encodeWithSignature("withdrawFunds()"));
        if (!ok) {
            // bubble revert reason if present
            if (data.length > 0) {
                assembly {
                    let returndata_size := mload(data)
                    revert(add(data, 32), returndata_size)
                }
            }
            revert("withdraw call failed");
        }
    }
}
