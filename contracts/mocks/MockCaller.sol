// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockCaller
 * @notice Helper contract to test E19 validation (contracts cannot purchase)
 */
contract MockCaller {
    function callPurchase(
        address presale,
        uint256 nftId,
        uint256 quantity,
        uint256 nonce,
        bytes calldata signature
    ) external payable {
        (bool success, bytes memory data) = presale.call{value: msg.value}(
            abi.encodeWithSignature(
                "purchaseWithETH(uint256,uint256,uint256,bytes)",
                nftId,
                quantity,
                nonce,
                signature
            )
        );
        require(success, string(data));
    }
}