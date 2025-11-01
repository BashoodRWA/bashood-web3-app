// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IRescueClaim {
    function claimEmergencyWithdrawal() external;
}

/**
 * @notice Minimal multisig using EIP-712 signatures to authorize execution of claim
 *  - Domain uses name/version provided to EIP712 base (chainId + contract address included by EIP712)
 *  - Nonce is per-rescue address to avoid replay across operations
 *  - Uses OpenZeppelin ECDSA for signature recovery
 */
contract MockProjectWalletMultiSigEIP712 is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant EXECUTE_CLAIM_TYPEHASH = keccak256("ExecuteClaim(address rescue,uint256 nonce)");

    mapping(address => bool) public isOwner;
    address[] public owners;
    uint256 public threshold;

    // nonce per rescue contract (prevents replay of same signatures for same rescue)
    mapping(address => uint256) public nonces;

    // If true, revert on receive to simulate recipient that rejects ETH
    bool public revertOnReceive;

    event MultisigExecuted(address indexed rescue, address indexed executor, uint256 validSigners, uint256 nonce);
    event EmergencyClaimed(address indexed rescue, address indexed multisig);

    constructor(
        address[] memory _owners,
        uint256 _threshold,
        string memory name,
        string memory version,
        bool _revertOnReceive
    ) EIP712(name, version) {
        require(_owners.length > 0, "Multisig: no owners");
        require(_threshold > 0 && _threshold <= _owners.length, "Multisig: invalid threshold");
        threshold = _threshold;
        owners = _owners;
        for (uint i = 0; i < _owners.length; i++) {
            isOwner[_owners[i]] = true;
        }
        revertOnReceive = _revertOnReceive;
    }

    /// @notice Return current nonce for a rescue
    function getNonce(address rescue) external view returns (uint256) {
        return nonces[rescue];
    }

    /**
     * @notice Execute claim on `rescue` using off-chain signatures from owners
     * @param rescue Address of the BashoodRescue contract
     * @param nonce Nonce value used when signing (must match current nonces[rescue])
     * @param signatures Array of signatures (bytes) from owners
     */
    function executeClaimWithSignatures(address rescue, uint256 nonce, bytes[] calldata signatures) external {
        // validate nonce matches current
        require(nonce == nonces[rescue], "Multisig: invalid nonce");

        // build digest
        bytes32 structHash = keccak256(abi.encode(EXECUTE_CLAIM_TYPEHASH, rescue, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);

        uint256 valid = 0;
        // local dedupe map
        address[] memory seenAddrs = new address[](owners.length);
        uint256 seenCount = 0;

        for (uint i = 0; i < signatures.length; i++) {
            address signer = ECDSA.recover(digest, signatures[i]);
            if (!isOwner[signer]) continue;

            // dedupe: check seenAddrs
            bool already = false;
            for (uint j = 0; j < seenCount; j++) {
                if (seenAddrs[j] == signer) {
                    already = true;
                    break;
                }
            }
            if (already) continue;
            // record
            seenAddrs[seenCount++] = signer;
            valid += 1;
            // small gas optimization: if reached threshold, can stop early
            if (valid >= threshold) break;
        }

        require(valid >= threshold, "Multisig: insufficient valid signatures");

        // Call claim on rescue. If this reverts, we DON'T increment nonce so retry is possible.
        IRescueClaim(rescue).claimEmergencyWithdrawal();

        // success: consume nonce and emit
        nonces[rescue] = nonces[rescue] + 1;
        emit MultisigExecuted(rescue, msg.sender, valid, nonce);
        emit EmergencyClaimed(rescue, address(this));
    }

    /// @notice Allow owner to reset nonce for rescue (test helper)
    function resetNonce(address rescue) external {
        // in tests we don't restrict but could require owner; keep simple for testing
        nonces[rescue] = 0;
    }

    receive() external payable {
        if (revertOnReceive) revert("MockProjectWalletMultiSigEIP712: refuse ETH");
    }
}
