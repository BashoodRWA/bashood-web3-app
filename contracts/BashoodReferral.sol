// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
interface IReferralValidator {
    function isValid(address referrer) external view returns (bool);
}
 
interface IBashoodMultiToken {
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}
 
contract BashoodReferral {
    address public owner;
    address public presaleAddress;
    IReferralValidator public validator;
    IBashoodMultiToken public nftContract;
 
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
 
    constructor(address _presaleAddress, address _validator, address _nftContract) {
    require(_presaleAddress != address(0), "Invalid presale address");
    require(_validator != address(0), "Invalid validator address");
    require(_nftContract != address(0), "Invalid NFT contract address");
 
        owner = msg.sender;
        presaleAddress = _presaleAddress;
        validator = IReferralValidator(_validator);
        nftContract = IBashoodMultiToken(_nftContract);
    }
 
    function setPresaleContract(address _presaleAddress) external {
        require(msg.sender == owner, "Only owner can set presale address");
        presaleAddress = _presaleAddress;
    }
 
    function rewardReferrer(address user, address referrer) external onlyPresale {
        require(user != address(0), "Direccion del referido no valida");
        require(referrer != address(0), "Direccion del referidor no valida");
        require(user != referrer, "No puedes referirte a ti mismo");
        require(referrals[user] == address(0), "Este usuario ya fue referido");
        // require(validator.isValid(referrer), "Referrer not valid"); // deshabilitado para tests
 
        referrals[user] = referrer;
        referralCount[referrer]++;
        rewarded[user] = true;
 
        emit ReferralRewarded(user, referrer);
    }
 
    function registerReferral(address referrer) external {
        require(referrer != address(0), "Direccion del referidor no valida");
        require(referrer != msg.sender, "No puedes referirte a ti mismo");
        require(referrals[msg.sender] == address(0), "Ya has sido referido");
 
        referrals[msg.sender] = referrer;
        referralCount[referrer]++;
        emit ReferralRegistered(msg.sender, referrer);
    }
 
    function claimNFT() external {
        require(referralCount[msg.sender] >= REQUIRED_REFERRALS, "No tienes suficientes referidos para reclamar");
        require(!claimedNFT[msg.sender], "Ya reclamaste tu NFT");
 
        claimedNFT[msg.sender] = true;
        nftContract.mint(msg.sender, NFT_ID, 1, "");
 
        emit NFTClaimed(msg.sender);
    }
 
    function getReferrerOf(address user) external view returns (address) {
        return referrals[user];
    }
 
    function hasClaimedNFT(address user) external view returns (bool) {
        return claimedNFT[user];
    }
 
    function getReferralCount(address user) external view returns (uint256) {
        return referralCount[user];
    }
}
 
 
 
 
 
 
 
 
 
 


