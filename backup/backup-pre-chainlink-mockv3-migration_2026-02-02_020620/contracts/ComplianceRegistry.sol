// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal Compliance Registry POC storing merkle roots and expirations per issuer
contract ComplianceRegistry is Ownable {
    constructor() Ownable(msg.sender) {}
    struct RootInfo { bytes32 root; uint256 expiry; }
    mapping(address => RootInfo) public issuerRoots;

    event RootSet(address indexed issuer, bytes32 root, uint256 expiry);
    event RootCleared(address indexed issuer);

    function setRoot(address issuer, bytes32 root, uint256 expiry) external onlyOwner {
        issuerRoots[issuer] = RootInfo({ root: root, expiry: expiry });
        emit RootSet(issuer, root, expiry);
    }

    function clearRoot(address issuer) external onlyOwner {
        delete issuerRoots[issuer];
        emit RootCleared(issuer);
    }

    function isValidProof(address issuer, bytes32 leaf, bytes32[] calldata proof) public view returns (bool) {
        RootInfo memory r = issuerRoots[issuer];
        if (r.root == bytes32(0)) return false;
        if (r.expiry != 0 && block.timestamp > r.expiry) return false;

        bytes32 computed = leaf;
        for (uint i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            if (computed < p) computed = keccak256(abi.encodePacked(computed, p));
            else computed = keccak256(abi.encodePacked(p, computed));
        }
        return computed == r.root;
    }
}
