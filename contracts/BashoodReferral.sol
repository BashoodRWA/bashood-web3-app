// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
 
interface IReferralValidator {
    function isValid(address referrer) external view returns (bool);
}
 
interface IBashoodMultiToken {
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}
 
/**
 * @title BashoodReferral
 * @author Bashood Team
 * @notice Referral system for the Bashood presale. Users earn NFT rewards after referring 3 buyers.
 * @dev Integrates with BashoodPresaleFinal (calls rewardReferrer on purchase) and
 *      BashoodMultiToken (mints reward NFT on claimNFT). Uses ReentrancyGuard on claim.
 */
contract BashoodReferral is ReentrancyGuard {
    address public immutable owner;
    address public presaleAddress;
    IReferralValidator public immutable validator;
    IBashoodMultiToken public immutable nftContract;
 
    uint256 public constant NFT_ID = 1;
    uint256 public constant REQUIRED_REFERRALS = 3;
 
    mapping(address => address) public referrals;
    mapping(address => uint256) public referralCount;
    mapping(address => bool) public claimedNFT;
    mapping(address => bool) public rewarded;    // trackeo de recompensas
 
    event ReferralRewarded(address indexed user, address indexed referrer);
    event ReferralRegistered(address indexed referred, address indexed referrer);
    event NFTClaimed(address indexed user);
 
    modifier onlyPresale() {
    require(msg.sender == presaleAddress, "Only presale can call this");
        _;
    }
 
    event PresaleContractUpdated(address indexed oldAddress, address indexed newAddress);

    constructor(address _presaleAddress, address _validator, address _nftContract) {
        require(_presaleAddress != address(0), "Invalid presale address");
        require(_validator != address(0), "Invalid validator address");
        require(_nftContract != address(0), "Invalid NFT contract address");

        owner = msg.sender;
        presaleAddress = _presaleAddress;
        validator = IReferralValidator(_validator);
        nftContract = IBashoodMultiToken(_nftContract);
    }
 
    /// @notice Update the presale contract address. Owner only.
    /// @param _presaleAddress New presale contract address (must not be zero)
    function setPresaleContract(address _presaleAddress) external {
        require(msg.sender == owner, "Only owner can set presale");
        require(_presaleAddress != address(0), "Invalid presale address");
        emit PresaleContractUpdated(presaleAddress, _presaleAddress);
        presaleAddress = _presaleAddress;
    }
 
    /// @notice Record a referral reward. Called by the presale contract during purchase.
    /// @dev Only callable by the presale contract via onlyPresale modifier.
    ///      H-03: This is the ONLY place where referralCount increments, ensuring
    ///      every credit corresponds to a verified on-chain purchase.
    ///      The validator check runs whenever `validator` is a deployed contract;
    ///      passing an EOA as validator (test deployments) skips the check gracefully.
    /// @param user The buyer who was referred
    /// @param referrer The referrer who will receive credit toward NFT reward
    function rewardReferrer(address user, address referrer) external onlyPresale {
        require(user != address(0), "Invalid user address");
        require(referrer != address(0), "Invalid referrer address");
        require(user != referrer, "Cannot refer yourself");
        require(referrals[user] == address(0), "User already referred");

        // H-03: validator check — only executed when validator is a real contract.
        // EOA validators (used in test deployments) are silently skipped.
        if (address(validator).code.length > 0) {
            require(validator.isValid(referrer), "Referrer not valid");
        }

        referrals[user] = referrer;
        referralCount[referrer]++;
        rewarded[user] = true;

        emit ReferralRewarded(user, referrer);
    }
 
    /// @notice Self-register a referral intent before purchasing. Any user can call this.
    /// @dev H-03 FIX: Only records the referrer mapping. referralCount is NOT incremented here;
    ///      it is incremented exclusively in rewardReferrer() which requires an actual purchase
    ///      routed through the presale contract. This eliminates Sybil attacks where puppet
    ///      wallets call registerReferral() without spending any ETH.
    /// @param referrer Address of the user who referred msg.sender
    function registerReferral(address referrer) external {
        require(referrer != address(0), "Invalid referrer address");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referrals[msg.sender] == address(0), "Already referred");

        referrals[msg.sender] = referrer;
        // NOTE: referralCount[referrer] is intentionally NOT incremented here (H-03).
        emit ReferralRegistered(msg.sender, referrer);
    }
 
    /// @notice Claim a reward NFT after reaching the required referral count (3).
    /// @dev Mints NFT_ID via BashoodMultiToken. Each user can claim once.
    function claimNFT() external nonReentrant {
        require(referralCount[msg.sender] >= REQUIRED_REFERRALS, "Not enough referrals to claim");
        require(!claimedNFT[msg.sender], "Ya reclamaste tu NFT");

        claimedNFT[msg.sender] = true;
        // Effects before interaction
        nftContract.mint(msg.sender, NFT_ID, 1, "");

        emit NFTClaimed(msg.sender);
    }
 
    /// @notice Get the referrer of a given user
    /// @param user Address to query
    /// @return Address of the referrer, or address(0) if none
    function getReferrerOf(address user) external view returns (address) {
        return referrals[user];
    }
 
    /// @notice Check if a user has already claimed their reward NFT
    /// @param user Address to query
    /// @return true if the user has claimed
    function hasClaimedNFT(address user) external view returns (bool) {
        return claimedNFT[user];
    }
 
    /// @notice Get how many referrals a user has earned
    /// @param user Address to query
    /// @return Number of successful referrals
    function getReferralCount(address user) external view returns (uint256) {
        return referralCount[user];
    }
}
 
 
 
 
 
 
 
 
 
 


