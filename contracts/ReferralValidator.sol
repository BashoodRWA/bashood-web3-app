// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// NOTE: IReferralValidator is declared in BashoodReferral.sol (file-level interface).
// ReferralValidator implements the same isValid(address) → bool signature so it can
// be used as a drop-in wherever IReferralValidator is expected. No explicit inheritance
// is needed because Solidity structural typing handles the cast at call sites.

/// @dev Minimal ERC-1155 balance interface used by ReferralValidator.
interface IERC1155Min {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title ReferralValidator
 * @notice Validates referrer addresses for BashoodReferral.
 *
 * ════════════════════════════════════════════════════════════
 * H-03 PRODUCTION GUARD — NFT-Holder Gate
 * ════════════════════════════════════════════════════════════
 * When `minNFTBalance > 0`, isValid() requires the referrer to
 * hold at least `minNFTBalance` units of `requiredNFTId` in
 * `nftContract` (ERC-1155). This ensures referrers are genuine
 * buyers, making Sybil attacks economically infeasible.
 *
 * Deployment flow:
 *   1. Deploy ReferralValidator(owner)
 *   2. Deploy BashoodReferral(..., validatorAddress, ...)
 *   3. After NFT contract is known:
 *        validator.setNFTRequirement(nftContract, 1, 1)
 *      → activates the holder gate for all future purchases.
 *
 * Until setNFTRequirement is called (minNFTBalance == 0), any
 * non-zero address is accepted — same as the previous behavior.
 */
contract ReferralValidator {
    address public immutable owner;

    address public nftContract;      // ERC-1155 NFT contract; address(0) = gate disabled
    uint256 public requiredNFTId;    // Token ID to check (typically 1 = presale NFT)
    uint256 public minNFTBalance;    // Minimum balance required; 0 = gate disabled

    event NFTRequirementSet(address indexed nftContract, uint256 nftId, uint256 minBalance);

    /**
     * @param _owner          Contract owner (can call setNFTRequirement).
     * @param _nftContract    ERC-1155 contract to use for gate; address(0) = gate disabled at birth.
     * @param _requiredNFTId  Token ID to check.
     * @param _minNFTBalance  Minimum balance; 0 = gate disabled at birth.
     */
    constructor(
        address _owner,
        address _nftContract,
        uint256 _requiredNFTId,
        uint256 _minNFTBalance
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_minNFTBalance == 0 || _nftContract != address(0), "Invalid NFT contract");
        owner = _owner;
        nftContract    = _nftContract;
        requiredNFTId  = _requiredNFTId;
        minNFTBalance  = _minNFTBalance;
        if (_minNFTBalance > 0) {
            emit NFTRequirementSet(_nftContract, _requiredNFTId, _minNFTBalance);
        }
    }

    /**
     * @notice Enable or update the NFT-holder gate.
     * @dev Owner only. Set minBalance = 0 to disable.
     * @param _nftContract ERC-1155 contract address
     * @param _nftId       Token ID referrers must hold
     * @param _minBalance  Minimum token balance required (0 = disable)
     */
    function setNFTRequirement(
        address _nftContract,
        uint256 _nftId,
        uint256 _minBalance
    ) external {
        require(msg.sender == owner, "Only owner");
        require(_minBalance == 0 || _nftContract != address(0), "Invalid NFT contract");
        nftContract = _nftContract;
        requiredNFTId = _nftId;
        minNFTBalance = _minBalance;
        emit NFTRequirementSet(_nftContract, _nftId, _minBalance);
    }

    /**
     * @notice Check whether `referrer` is a valid referrer.
     * @dev When the NFT gate is active (minNFTBalance > 0), the referrer must hold
     *      at least minNFTBalance of requiredNFTId. Otherwise any non-zero address passes.
     */
    function isValid(address referrer) external view returns (bool) {
        if (referrer == address(0)) return false;
        if (minNFTBalance == 0 || nftContract == address(0)) return true;
        return IERC1155Min(nftContract).balanceOf(referrer, requiredNFTId) >= minNFTBalance;
    }
}
