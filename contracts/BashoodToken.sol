// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
 
/**
 * @title BashoodToken (BHT) - VersiÃ³n Personalizada con Pausable
 */
contract BashoodToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    uint256 public burnRate = 10;         // 0.1% (en basis points, 10/10000)
    uint256 public treasuryFee = 50;      // 0.5% (en basis points, 50/10000)
    uint256 public constant DENOMINATOR = 10000;
 
    address public treasuryWallet;
    address public stakingContract;
 
    uint256 public totalBurned;
    uint256 public totalToTreasury;
    uint256 public totalDonated;
 
    event TokensBurned(address indexed from, uint256 amount);
    event FeeToTreasury(address indexed from, uint256 amount);
    event DonationReceived(address indexed from, uint256 amount);
    event TreasuryWalletChanged(address indexed oldWallet, address indexed newWallet);
    event StakingContractChanged(address indexed oldContract, address indexed newContract);
    event BurnRateChanged(uint256 oldRate, uint256 newRate);
    event TreasuryFeeChanged(uint256 oldFee, uint256 newFee);
 
    constructor(address _treasuryWallet) ERC20("Bashood Token", "BHT") Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "Treasury required");
        treasuryWallet = _treasuryWallet;
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }
 
    // --- Transferencia con quema y fee a tesorerÃ­a ---
    // Implement transfer logic with burn and fee in the public transfer methods
    function transfer(address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        address sender = _msgSender();
        require(amount > 0, "Transfer amount must be greater than zero");

        uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
        uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
        uint256 sendAmount = amount - burnAmount - feeAmount;

        require(sendAmount > 0, "Send amount must be greater than zero");

        if (burnAmount > 0) {
            super._burn(sender, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(sender, burnAmount);
        }

        if (feeAmount > 0) {
            super._transfer(sender, treasuryWallet, feeAmount);
            totalToTreasury += feeAmount;
            emit FeeToTreasury(sender, feeAmount);
        }

        super._transfer(sender, recipient, sendAmount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        address spender = _msgSender();
        _spendAllowance(sender, spender, amount);

        require(amount > 0, "Transfer amount must be greater than zero");
        uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
        uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
        uint256 sendAmount = amount - burnAmount - feeAmount;

        require(sendAmount > 0, "Send amount must be greater than zero");

        if (burnAmount > 0) {
            super._burn(sender, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(sender, burnAmount);
        }

        if (feeAmount > 0) {
            super._transfer(sender, treasuryWallet, feeAmount);
            totalToTreasury += feeAmount;
            emit FeeToTreasury(sender, feeAmount);
        }

        super._transfer(sender, recipient, sendAmount);
        return true;
    }
 
    // --- Donaciones directas al contrato ---
    function donate(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        _transfer(_msgSender(), address(this), amount);
        totalDonated += amount;
        emit DonationReceived(_msgSender(), amount);
    }
 
    // --- Quema manual por cualquier usuario ---
    function burn(uint256 amount) external whenNotPaused {
        _burn(_msgSender(), amount);
        totalBurned += amount;
        emit TokensBurned(_msgSender(), amount);
    }
 
    // --- Quema periÃ³dica de fondos acumulados en el contrato (solo owner) ---
    function periodicBurn(uint256 amount) external onlyOwner whenNotPaused {
        require(balanceOf(address(this)) >= amount, "Not enough tokens to burn");
        _burn(address(this), amount);
        totalBurned += amount;
        emit TokensBurned(address(this), amount);
    }
 
    // --- Enviar tokens acumulados a TesorerÃ­a o Staking (solo owner) ---
    function sendToTreasury(uint256 amount) external onlyOwner whenNotPaused {
        require(balanceOf(address(this)) >= amount, "Not enough tokens");
        _transfer(address(this), treasuryWallet, amount);
    }
 
    function sendToStaking(uint256 amount) external onlyOwner whenNotPaused {
        require(stakingContract != address(0), "Staking contract not set");
        require(balanceOf(address(this)) >= amount, "Not enough tokens");
        _transfer(address(this), stakingContract, amount);
    }
 
    // --- ConfiguraciÃ³n de parÃ¡metros (solo owner) ---
    function setTreasuryWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        emit TreasuryWalletChanged(treasuryWallet, newWallet);
        treasuryWallet = newWallet;
    }
 
    function setStakingContract(address newContract) external onlyOwner {
        require(newContract != address(0), "Invalid address");
        emit StakingContractChanged(stakingContract, newContract);
        stakingContract = newContract;
    }
 
 
    function setBurnRate(uint256 newRate) external onlyOwner {
        require(newRate <= 100, "Max 1% burn");
        emit BurnRateChanged(burnRate, newRate);
        burnRate = newRate;
    }
 
    function setTreasuryFee(uint256 newFee) external onlyOwner {
        require(newFee <= 200, "Max 2% fee");
        emit TreasuryFeeChanged(treasuryFee, newFee);
        treasuryFee = newFee;
    }
 
    // --- Funciones de pausa ---
    function pause() external onlyOwner {
        _pause();
    }
 
    function unpause() external onlyOwner {
        _unpause();
    }
}


