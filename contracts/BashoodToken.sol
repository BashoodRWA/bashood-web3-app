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
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;
&nbsp;// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
&nbsp;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
&nbsp;
/**
 * @title BashoodToken (BHT) - Versión Personalizada con Pausable
 */
contract BashoodToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    uint256 public burnRate = 10;         // 0.1% (en basis points, 10/10000)
    uint256 public treasuryFee = 50;      // 0.5% (en basis points, 50/10000)
    uint256 public constant DENOMINATOR = 10000;
&nbsp;
    address public treasuryWallet;
    address public stakingContract;
&nbsp;
    uint256 public totalBurned;
    uint256 public totalToTreasury;
    uint256 public totalDonated;
&nbsp;
    event TokensBurned(address indexed from, uint256 amount);
    event FeeToTreasury(address indexed from, uint256 amount);
    event DonationReceived(address indexed from, uint256 amount);
    event TreasuryWalletChanged(address indexed oldWallet, address indexed newWallet);
    event StakingContractChanged(address indexed oldContract, address indexed newContract);
    event BurnRateChanged(uint256 oldRate, uint256 newRate);
    event TreasuryFeeChanged(uint256 oldFee, uint256 newFee);
&nbsp;
    constructor(address _treasuryWallet) ERC20("Bashood Token", "BHT") Ownable() {
        treasuryWallet = _treasuryWallet;
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }
&nbsp;
    // --- Transferencia con quema y fee a tesorería ---
    function _transfer(address sender, address recipient, uint256 amount) internal override whenNotPaused {
        require(amount &gt; 0, "Transfer amount must be greater than zero");
&nbsp;
        uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
        uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
        uint256 sendAmount = amount - burnAmount - feeAmount;
&nbsp;
        require(sendAmount &gt; 0, "Send amount must be greater than zero");
&nbsp;
        if (burnAmount &gt; 0) {
            super._burn(sender, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(sender, burnAmount);
        }
&nbsp;
        if (feeAmount &gt; 0) {
            super._transfer(sender, treasuryWallet, feeAmount);
            totalToTreasury += feeAmount;
            emit FeeToTreasury(sender, feeAmount);
        }
&nbsp;
        super._transfer(sender, recipient, sendAmount);
    }
&nbsp;
    // --- Donaciones directas al contrato ---
    function donate(uint256 amount) external nonReentrant whenNotPaused {
        require(amount &gt; 0, "Amount must be &gt; 0");
        _transfer(_msgSender(), address(this), amount);
        totalDonated += amount;
        emit DonationReceived(_msgSender(), amount);
    }
&nbsp;
    // --- Quema manual por cualquier usuario ---
    function burn(uint256 amount) external whenNotPaused {
        _burn(_msgSender(), amount);
        totalBurned += amount;
        emit TokensBurned(_msgSender(), amount);
    }
&nbsp;
    // --- Quema periódica de fondos acumulados en el contrato (solo owner) ---
    function periodicBurn(uint256 amount) external onlyOwner whenNotPaused {
        require(balanceOf(address(this)) &gt;= amount, "Not enough tokens to burn");
        _burn(address(this), amount);
        totalBurned += amount;
        emit TokensBurned(address(this), amount);
    }
&nbsp;
    // --- Enviar tokens acumulados a Tesorería o Staking (solo owner) ---
    function sendToTreasury(uint256 amount) external onlyOwner whenNotPaused {
        require(balanceOf(address(this)) &gt;= amount, "Not enough tokens");
        _transfer(address(this), treasuryWallet, amount);
    }
&nbsp;
    function sendToStaking(uint256 amount) external onlyOwner whenNotPaused {
        require(stakingContract != address(0), "Staking contract not set");
        require(balanceOf(address(this)) &gt;= amount, "Not enough tokens");
        _transfer(address(this), stakingContract, amount);
    }
&nbsp;
    // --- Configuración de parámetros (solo owner) ---
    function setTreasuryWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        emit TreasuryWalletChanged(treasuryWallet, newWallet);
        treasuryWallet = newWallet;
    }
&nbsp;
    function setStakingContract(address newContract) external onlyOwner {
        require(newContract != address(0), "Invalid address");
        emit StakingContractChanged(stakingContract, newContract);
        stakingContract = newContract;
    }
&nbsp;
&nbsp;
    function setBurnRate(uint256 newRate) external onlyOwner {
        require(newRate &lt;= 100, "Max 1% burn");
        emit BurnRateChanged(burnRate, newRate);
        burnRate = newRate;
    }
&nbsp;
    function setTreasuryFee(uint256 newFee) external onlyOwner {
        require(newFee &lt;= 200, "Max 2% fee");
        emit TreasuryFeeChanged(treasuryFee, newFee);
        treasuryFee = newFee;
    }
&nbsp;
    // --- Funciones de pausa ---
    function pause() external onlyOwner {
        _pause();
    }
&nbsp;
    function unpause() external onlyOwner {
        _unpause();
    }
}
