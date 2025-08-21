&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
6×
6×
&nbsp;
&nbsp;
&nbsp;
58×
57×
57×
&nbsp;
57×
57×
57×
57×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
6×
6×
6×
6×
&nbsp;
&nbsp;
6×
6×
6×
&nbsp;
6×
&nbsp;
&nbsp;
&nbsp;
10×
9×
8×
&nbsp;
6×
6×
6×
&nbsp;
&nbsp;
&nbsp;
2×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
1×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
&nbsp;
interface IReferralValidator {
    function isValid(address referrer) external view returns (bool);
}
&nbsp;
interface IBashoodMultiToken {
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}
&nbsp;
contract BashoodReferral {
    address public owner;
    address public presaleAddress;
    IReferralValidator public validator;
    IBashoodMultiToken public nftContract;
&nbsp;
    uint256 public constant NFT_ID = 1;
    uint256 public constant REQUIRED_REFERRALS = 3;
&nbsp;
    mapping(address =&gt; address) public referrals;
    mapping(address =&gt; uint256) public referralCount;
    mapping(address =&gt; bool) public claimedNFT;
    mapping(address =&gt; bool) public rewarded;    // trackeo de recompensas
&nbsp;
    event ReferralRewarded(address indexed user, address indexed referrer);
    event ReferralRegistered(address indexed referred, address indexed referrer);
    event NFTClaimed(address indexed user);
&nbsp;
    modifier onlyPresale() {
        Erequire(msg.sender == presaleAddress, "Only presale can call this");
        _;
    }
&nbsp;
    constructor(address _presaleAddress, address _validator, address _nftContract) {
        require(_presaleAddress != address(0), "Invalid presale address");
        Erequire(_validator != address(0), "Invalid validator address");
        Erequire(_nftContract != address(0), "Invalid NFT contract address");
&nbsp;
        owner = msg.sender;
        presaleAddress = _presaleAddress;
        validator = IReferralValidator(_validator);
        nftContract = IBashoodMultiToken(_nftContract);
    }
&nbsp;
    function setPresaleContract(address _presaleAddress) external {
        require(msg.sender == owner, "Only owner can set presale address");
        presaleAddress = _presaleAddress;
    }
&nbsp;
    function rewardReferrer(address user, address referrer) external EonlyPresale {
        Erequire(user != address(0), "Direccion del referido no valida");
        Erequire(referrer != address(0), "Direccion del referidor no valida");
        Erequire(user != referrer, "No puedes referirte a ti mismo");
        Erequire(referrals[user] == address(0), "Este usuario ya fue referido");
        // require(validator.isValid(referrer), "Referrer not valid"); // deshabilitado para tests
&nbsp;
        referrals[user] = referrer;
        referralCount[referrer]++;
        rewarded[user] = true;
&nbsp;
        emit ReferralRewarded(user, referrer);
    }
&nbsp;
    function registerReferral(address referrer) external {
        require(referrer != address(0), "Direccion del referidor no valida");
        require(referrer != msg.sender, "No puedes referirte a ti mismo");
        require(referrals[msg.sender] == address(0), "Ya has sido referido");
&nbsp;
        referrals[msg.sender] = referrer;
        referralCount[referrer]++;
        emit ReferralRegistered(msg.sender, referrer);
    }
&nbsp;
    function claimNFT() external {
        Irequire(referralCount[msg.sender] &gt;= REQUIRED_REFERRALS, "No tienes suficientes referidos para reclamar");
        require(!claimedNFT[msg.sender], "Ya reclamaste tu NFT");
&nbsp;
        claimedNFT[msg.sender] = true;
        nftContract.mint(msg.sender, NFT_ID, 1, "");
&nbsp;
        emit NFTClaimed(msg.sender);
    }
&nbsp;
    function getReferrerOf(address user) external view returns (address) {
        return referrals[user];
    }
&nbsp;
    function hasClaimedNFT(address user) external view returns (bool) {
        return claimedNFT[user];
    }
&nbsp;
    function getReferralCount(address user) external view returns (uint256) {
        return referralCount[user];
    }
}
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
