// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BadReceiver721 {
    // Does not implement IERC721Receiver; safeTransferFrom to this contract should revert
    fallback() external payable {}
}
