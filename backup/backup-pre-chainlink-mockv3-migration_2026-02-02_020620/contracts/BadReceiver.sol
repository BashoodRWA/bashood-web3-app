// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BadReceiver {
    // Intentionally does NOT implement IERC1155Receiver
    // Acts as a plain contract that will cause safeTransferFrom to revert when called
    fallback() external payable {}
}
