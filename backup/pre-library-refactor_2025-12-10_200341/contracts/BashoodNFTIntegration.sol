// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title BashoodNFTIntegration
 * @dev Integration contract for Bashood Property NFTs with presale and token system
 * @notice This contract handles NFT rewards, staking, and marketplace functionality
 */
contract BashoodNFTIntegration is Ownable, ReentrancyGuard, Pausable {

    // Contracts
    IERC721 public immutable propertyNFT;
    address public presaleContract;
    IERC20 public bashoodToken;

    // Reward system
    struct RewardTier {
        uint256 minPurchase;
        uint256 nftReward;
        bool active;
    }

    mapping(uint256 => RewardTier) public rewardTiers;
    uint256 public rewardTierCount;
    mapping(address => uint256) public userTotalPurchases;
    mapping(address => uint256) public userNFTRewardsEarned;

    // Staking system
    struct StakeInfo {
        uint256[] tokenIds;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalRewardsClaimed;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(uint256 => address) public tokenStaker; // tokenId => staker
    uint256 public stakingRewardPerDay; // tokens per NFT per day
    bool public stakingEnabled;

    // Marketplace
    struct Listing {
        address seller;
        uint256 price;
        bool active;
        uint256 listedAt;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public marketplaceFeePercent; // in basis points (100 = 1%)
    bool public marketplaceEnabled;
    uint256 public totalVolume;
    uint256 public totalTrades;

    // Special collections
    mapping(uint256 => bool) public isSpecialEdition;
    mapping(address => bool) public isEarlyInvestor;
    uint256 public specialEditionCount;

    // Events
    event NFTRewardEarned(address indexed user, uint256 amount, uint256 totalPurchase);
    event TokensStaked(address indexed user, uint256[] tokenIds);
    event TokensUnstaked(address indexed user, uint256[] tokenIds);
    event StakingRewardsClaimed(address indexed user, uint256 amount);
    event PropertyListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event PropertySold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event SpecialEditionMinted(uint256 indexed tokenId, address indexed recipient);
    event RewardTierUpdated(uint256 tierId, uint256 minPurchase, uint256 nftReward);

    constructor(
        address _propertyNFT,
        address _presaleContract,
        address _bashoodToken
    ) Ownable(msg.sender) {
        require(_propertyNFT != address(0), "Invalid Property NFT address");
        
        propertyNFT = IERC721(_propertyNFT);
        presaleContract = _presaleContract;
        bashoodToken = IERC20(_bashoodToken);
        
        // Default settings
        stakingRewardPerDay = 100 * 10**18; // 100 tokens per NFT per day
        marketplaceFeePercent = 250; // 2.5%
        stakingEnabled = false;
        marketplaceEnabled = false;
    }

    // Reward System Functions
    function setRewardTier(uint256 _minPurchase, uint256 _nftReward) external onlyOwner {
        rewardTierCount++;
        rewardTiers[rewardTierCount] = RewardTier({
            minPurchase: _minPurchase,
            nftReward: _nftReward,
            active: true
        });
        
        emit RewardTierUpdated(rewardTierCount, _minPurchase, _nftReward);
    }

    function updateRewardTier(uint256 _tierId, uint256 _minPurchase, uint256 _nftReward, bool _active) external onlyOwner {
        require(_tierId <= rewardTierCount, "Invalid tier ID");
        
        RewardTier storage tier = rewardTiers[_tierId];
        tier.minPurchase = _minPurchase;
        tier.nftReward = _nftReward;
        tier.active = _active;
        
        emit RewardTierUpdated(_tierId, _minPurchase, _nftReward);
    }

    function recordPurchase(address _user, uint256 _amount) external {
        require(msg.sender == presaleContract || msg.sender == owner(), "Unauthorized");
        
        userTotalPurchases[_user] = userTotalPurchases[_user] + _amount;
        
        uint256 nftReward = checkNFTRewardQualification(_user, _amount);
        if (nftReward > 0) {
            userNFTRewardsEarned[_user] = userNFTRewardsEarned[_user] + nftReward;
            emit NFTRewardEarned(_user, nftReward, userTotalPurchases[_user]);
        }
    }

    function checkNFTRewardQualification(address _user, uint256 _purchaseAmount) public view returns (uint256 nftReward) {
        uint256 newTotal = userTotalPurchases[_user] + _purchaseAmount;
        
        // Find highest qualifying tier
        for (uint256 i = 1; i <= rewardTierCount; i++) {
            RewardTier memory tier = rewardTiers[i];
            if (tier.active && newTotal >= tier.minPurchase) {
                nftReward = tier.nftReward;
            }
        }
        
        // Subtract already earned rewards
        nftReward = nftReward > userNFTRewardsEarned[_user] ? nftReward - userNFTRewardsEarned[_user] : 0;
    }

    // Staking Functions
    function stakeNFTs(uint256[] calldata _tokenIds) external nonReentrant whenNotPaused {
        require(stakingEnabled, "Staking disabled");
        require(_tokenIds.length > 0, "No tokens provided");
        
        StakeInfo storage userStake = stakes[msg.sender];
        
        // Claim existing rewards before adding new tokens
        if (userStake.tokenIds.length > 0) {
            _claimStakingRewards(msg.sender);
        }
        
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
            require(tokenStaker[tokenId] == address(0), "Token already staked");
            
            // Transfer NFT to this contract
            propertyNFT.transferFrom(msg.sender, address(this), tokenId);
            
            tokenStaker[tokenId] = msg.sender;
            userStake.tokenIds.push(tokenId);
        }
        
        if (userStake.startTime == 0) {
            userStake.startTime = block.timestamp;
        }
        userStake.lastClaimTime = block.timestamp;
        
        emit TokensStaked(msg.sender, _tokenIds);
    }

    function unstakeNFTs(uint256[] calldata _tokenIds) external nonReentrant {
        require(_tokenIds.length > 0, "No tokens provided");
        
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.tokenIds.length > 0, "No staked tokens");
        
        // Claim rewards before unstaking
        _claimStakingRewards(msg.sender);
        
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            require(tokenStaker[tokenId] == msg.sender, "Not your staked token");
            
            // Remove from user's staked tokens array
            _removeFromStakedTokens(msg.sender, tokenId);
            
            // Clear staker mapping
            tokenStaker[tokenId] = address(0);
            
            // Return NFT to user
            propertyNFT.transferFrom(address(this), msg.sender, tokenId);
        }
        
        emit TokensUnstaked(msg.sender, _tokenIds);
    }

    function claimStakingRewards() external nonReentrant {
        _claimStakingRewards(msg.sender);
    }

    function _claimStakingRewards(address _user) internal {
        StakeInfo storage userStake = stakes[_user];
        uint256 reward = calculateStakingRewards(_user);
        
        if (reward > 0) {
            userStake.lastClaimTime = block.timestamp;
            userStake.totalRewardsClaimed = userStake.totalRewardsClaimed + reward;
            
            // Transfer tokens (assumes this contract has allowance or tokens)
            if (address(bashoodToken) != address(0)) {
                bashoodToken.transfer(_user, reward);
            }
            
            emit StakingRewardsClaimed(_user, reward);
        }
    }

    function calculateStakingRewards(address _user) public view returns (uint256) {
        StakeInfo memory userStake = stakes[_user];
        if (userStake.tokenIds.length == 0 || userStake.lastClaimTime == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - userStake.lastClaimTime;
        uint256 daysStaked = stakingDuration / 86400; // seconds in a day
        
        return userStake.tokenIds.length * stakingRewardPerDay * daysStaked;
    }

    function _removeFromStakedTokens(address _user, uint256 _tokenId) internal {
        StakeInfo storage userStake = stakes[_user];
        for (uint256 i = 0; i < userStake.tokenIds.length; i++) {
            if (userStake.tokenIds[i] == _tokenId) {
                userStake.tokenIds[i] = userStake.tokenIds[userStake.tokenIds.length - 1];
                userStake.tokenIds.pop();
                break;
            }
        }
    }

    // Marketplace Functions
    function listProperty(uint256 _tokenId, uint256 _price) external nonReentrant whenNotPaused {
        require(marketplaceEnabled, "Marketplace disabled");
        require(propertyNFT.ownerOf(_tokenId) == msg.sender, "Not token owner");
        require(_price > 0, "Invalid price");
        require(tokenStaker[_tokenId] == address(0), "Cannot list staked token");
        
        // Transfer NFT to this contract for escrow
        propertyNFT.transferFrom(msg.sender, address(this), _tokenId);
        
        listings[_tokenId] = Listing({
            seller: msg.sender,
            price: _price,
            active: true,
            listedAt: block.timestamp
        });
        
        emit PropertyListed(_tokenId, msg.sender, _price);
    }

    function buyProperty(uint256 _tokenId) external payable nonReentrant whenNotPaused {
        require(marketplaceEnabled, "Marketplace disabled");
        
        Listing storage listing = listings[_tokenId];
        require(listing.active, "Not listed");
        require(msg.value == listing.price, "Incorrect payment");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // Calculate fees
        uint256 fee = price * marketplaceFeePercent / 10000;
        uint256 sellerAmount = price - fee;
        
        // Update listing
        listing.active = false;
        
        // Update statistics
        totalVolume = totalVolume + price;
        totalTrades = totalTrades + 1;
        
        // Transfer payment
        payable(seller).transfer(sellerAmount);
        // Fee stays in contract (can be withdrawn by owner)
        
        // Transfer NFT to buyer
        propertyNFT.transferFrom(address(this), msg.sender, _tokenId);
        
        emit PropertySold(_tokenId, seller, msg.sender, price);
    }

    function cancelListing(uint256 _tokenId) external nonReentrant {
        Listing storage listing = listings[_tokenId];
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.active, "Not active");
        
        listing.active = false;
        
        // Return NFT to seller
        propertyNFT.transferFrom(address(this), msg.sender, _tokenId);
    }

    // Special Edition Functions
    function markAsSpecialEdition(uint256 _tokenId) external onlyOwner {
        require(_tokenId > 0, "Invalid token ID");
        if (!isSpecialEdition[_tokenId]) {
            isSpecialEdition[_tokenId] = true;
            specialEditionCount++;
        }
    }

    function setEarlyInvestor(address _investor, bool _status) external onlyOwner {
        isEarlyInvestor[_investor] = _status;
    }

    // Admin Functions
    function setPresaleContract(address _presaleContract) external onlyOwner {
        presaleContract = _presaleContract;
    }

    function setBashoodToken(address _bashoodToken) external onlyOwner {
        bashoodToken = IERC20(_bashoodToken);
    }

    function setStakingReward(uint256 _stakingRewardPerDay) external onlyOwner {
        stakingRewardPerDay = _stakingRewardPerDay;
    }

    function enableNFTStaking(bool _enabled) external onlyOwner {
        stakingEnabled = _enabled;
    }

    function enableMarketplace(bool _enabled) external onlyOwner {
        marketplaceEnabled = _enabled;
    }

    function setMarketplaceFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        marketplaceFeePercent = _feePercent;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    function emergencyWithdrawTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }

    // View Functions
    function getUserStakeInfo(address _user) external view returns (
        uint256[] memory tokenIds,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 totalRewardsClaimed,
        uint256 pendingRewards
    ) {
        StakeInfo memory userStake = stakes[_user];
        return (
            userStake.tokenIds,
            userStake.startTime,
            userStake.lastClaimTime,
            userStake.totalRewardsClaimed,
            calculateStakingRewards(_user)
        );
    }

    function getRewardTierInfo(uint256 _tierId) external view returns (RewardTier memory) {
        return rewardTiers[_tierId];
    }

    function getListingInfo(uint256 _tokenId) external view returns (Listing memory) {
        return listings[_tokenId];
    }

    function isTokenStaked(uint256 _tokenId) external view returns (bool) {
        return tokenStaker[_tokenId] != address(0);
    }

    function getMarketplaceStats() external view returns (
        uint256 volume,
        uint256 trades,
        uint256 feePercent,
        bool enabled
    ) {
        return (totalVolume, totalTrades, marketplaceFeePercent, marketplaceEnabled);
    }

    // Emergency function to handle stuck NFTs
    function emergencyNFTWithdraw(uint256 _tokenId) external onlyOwner {
        propertyNFT.transferFrom(address(this), owner(), _tokenId);
    }

    receive() external payable {}
}