// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
 
// Custom Errors para optimización de gas
error InvalidTreasuryWallet();
error InvalidAmount();
error ExceededBurnRate();
error ExceededTreasuryFee();
error InvalidStakingContract();
error ParametersAreLocked();

/**
 * @title BashoodToken (BHT)
 * @author Bashood Team
 * @notice ERC20 token with deflationary mechanics: automatic burn and treasury fee on transfers.
 * @dev Uses Ownable for admin, Pausable with 24h timelock, and ReentrancyGuard for donations.
 *      On every transfer: burnRate (max 1%) is burned, treasuryFee (max 2%) goes to treasury.
 *      Pause/unpause requires requestPause() → wait 24h → executePause() to protect holders.
 */
contract BashoodToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    // Constantes optimizadas
    uint256 private constant _MAX_BURN_RATE = 100;     // 1% max
    uint256 private constant _MAX_TREASURY_FEE = 200;  // 2% max
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant PAUSE_DELAY = 24 hours;    // Timelock para pause/unpause
    
    // Variables optimizadas sin inicialización innecesaria
    uint256 public burnRate;         // 0.1% (en basis points, 10/10000)
    uint256 public treasuryFee;      // 0.5% (en basis points, 50/10000)
 
    address public treasuryWallet;

    /**
     * @dev Points to the governance rewards pool / staking distributor.
     *      In production this MUST be set to the BashoodTimelock address
     *      BEFORE calling lockParameters() — otherwise sendToGovernancePool()
     *      will always revert after the lock.
     *      Default value address(0) is safe: sendToGovernancePool() guards against it.
     */
    address public stakingContract;
 
    uint256 public totalBurned;
    uint256 public totalToTreasury;
    uint256 public totalDonated;
    
    // Timelock para pause/unpause
    uint256 public pauseRequestTime;
    uint256 public unpauseRequestTime;
    
    // Parameter lock for regulatory compliance
    bool public parametersLocked;
 
    event TokensBurned(address indexed from, uint256 amount);
    event FeeToTreasury(address indexed from, uint256 amount);
    event DonationReceived(address indexed from, uint256 amount);
    event TreasuryWalletChanged(address indexed oldWallet, address indexed newWallet);
    event StakingContractChanged(address indexed oldContract, address indexed newContract);
    event BurnRateChanged(uint256 oldRate, uint256 newRate);
    event TreasuryFeeChanged(uint256 oldFee, uint256 newFee);
    event PauseRequested(uint256 executeTime);
    event UnpauseRequested(uint256 executeTime);
    event PauseRequestCancelled();
    event UnpauseRequestCancelled();
    event ParametersLocked(uint256 timestamp);
 
    constructor(address _treasuryWallet) ERC20("BashoodToken", "BHT") Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "Treasury required");
        treasuryWallet = _treasuryWallet;
        
        // Inicializar valores optimizados
        burnRate = 10;    // 0.1%
        treasuryFee = 50; // 0.5%
        
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }
 
    /// @notice Transfer tokens with automatic burn and treasury fee deduction
    /// @dev Overrides ERC20.transfer. Amount is split: burnRate% burned, treasuryFee% to treasury, remainder to recipient.
    /// @param recipient Address to receive the net amount after deductions
    /// @param amount Gross amount to transfer (before burn and fee)
    /// @return true on success
    function transfer(address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        address sender = _msgSender();
        require(amount > 0, "Amount must be > 0");

        uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
        uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
        uint256 sendAmount = amount - burnAmount - feeAmount;

        require(sendAmount > 0, "Send amount must be > 0");

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

    /// @notice Transfer tokens on behalf of sender with automatic burn and treasury fee
    /// @dev Overrides ERC20.transferFrom. Spends allowance, then applies burn + fee logic.
    /// @param sender Address from which tokens are transferred
    /// @param recipient Address to receive the net amount
    /// @param amount Gross amount to transfer (before burn and fee)
    /// @return true on success
    function transferFrom(address sender, address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        address spender = _msgSender();
        _spendAllowance(sender, spender, amount);

        require(amount > 0, "Amount must be > 0");
        uint256 burnAmount = (amount * burnRate) / DENOMINATOR;
        uint256 feeAmount = (amount * treasuryFee) / DENOMINATOR;
        uint256 sendAmount = amount - burnAmount - feeAmount;

        require(sendAmount > 0, "Send must be > 0");

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
 
    /// @notice Donate tokens to the contract (held for periodic burns or treasury transfers)
    /// @param amount Amount of tokens to donate
    function donate(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        _transfer(_msgSender(), address(this), amount);
        totalDonated += amount;
        emit DonationReceived(_msgSender(), amount);
    }
 
    /// @notice Burn tokens from caller's balance permanently
    /// @param amount Amount of tokens to burn
    function burn(uint256 amount) external whenNotPaused {
        _burn(_msgSender(), amount);
        totalBurned += amount;
        emit TokensBurned(_msgSender(), amount);
    }
 
    /// @notice Burn tokens accumulated in the contract (from donations). Owner only.
    /// @param amount Amount of contract-held tokens to burn
    function periodicBurn(uint256 amount) external onlyOwner whenNotPaused {
        require(balanceOf(address(this)) >= amount, "Not enough tokens to burn");
        _burn(address(this), amount);
        totalBurned += amount;
        emit TokensBurned(address(this), amount);
    }
 
    /// @notice Send contract-held tokens to the treasury wallet. Owner only.
    /// @param amount Amount of tokens to send to treasury
    function sendToTreasury(uint256 amount) external onlyOwner whenNotPaused {
        require(balanceOf(address(this)) >= amount, "Not enough tokens");
        _transfer(address(this), treasuryWallet, amount);
    }
 
    /**
     * @notice Send contract-held tokens to the governance rewards pool.
     * @dev `stakingContract` MUST be set to BashoodTimelock (or a governance
     *      rewards distributor) before calling this function. Owner only.
     *
     *      Legacy name preserved for test compatibility. In production, this
     *      function routes tokens to the timelock-controlled governance pool.
     *      If stakingContract == address(0), the call reverts.
     *
     * @param amount Amount of tokens to send
     */
    function sendToStaking(uint256 amount) external onlyOwner whenNotPaused {
        if (stakingContract == address(0)) revert InvalidStakingContract();
        require(balanceOf(address(this)) >= amount, "Not enough tokens");
        _transfer(address(this), stakingContract, amount);
    }
 
    /// @notice Update the treasury wallet address. Owner only.
    /// @param newWallet New treasury wallet (must not be zero address)
    /// @dev Reverts if parameters are locked
    function setTreasuryWallet(address newWallet) external onlyOwner {
        if (parametersLocked) revert ParametersAreLocked();
        require(newWallet != address(0), "Invalid address");
        emit TreasuryWalletChanged(treasuryWallet, newWallet);
        treasuryWallet = newWallet;
    }
 
    /// @notice Set the staking contract address for token distribution. Owner only.
    /// @param newContract Address of the staking contract (must not be zero)
    /// @dev Reverts if parameters are locked
    function setStakingContract(address newContract) external onlyOwner {
        if (parametersLocked) revert ParametersAreLocked();
        require(newContract != address(0), "Invalid address");
        emit StakingContractChanged(stakingContract, newContract);
        stakingContract = newContract;
    }
 
 
    /// @notice Set the burn rate applied on every transfer. Owner only.
    /// @param newRate New burn rate in basis points (max 100 = 1%)
    /// @dev Reverts if parameters are locked
    function setBurnRate(uint256 newRate) external onlyOwner {
        if (parametersLocked) revert ParametersAreLocked();
        require(newRate <= _MAX_BURN_RATE, "Max 1% burn");
        emit BurnRateChanged(burnRate, newRate);
        burnRate = newRate;
    }

    /// @notice Set the treasury fee applied on every transfer. Owner only.
    /// @param newFee New treasury fee in basis points (max 200 = 2%)
    /// @dev Reverts if parameters are locked
    function setTreasuryFee(uint256 newFee) external onlyOwner {
        if (parametersLocked) revert ParametersAreLocked();
        require(newFee <= _MAX_TREASURY_FEE, "Max 2% fee");
        emit TreasuryFeeChanged(treasuryFee, newFee);
        treasuryFee = newFee;
    }

    // --- Funciones de pausa con timelock de 24h ---
    
    /**
     * @notice Solicita pausar el contrato. Se ejecutará después de 24h.
     * @dev Los holders tienen 24h para reaccionar antes de que se ejecute.
     */
    function requestPause() external onlyOwner whenNotPaused {
        pauseRequestTime = block.timestamp;
        emit PauseRequested(block.timestamp + PAUSE_DELAY);
    }
    
    /**
     * @notice Ejecuta la pausa después de que hayan pasado 24h desde el request.
     */
    function executePause() external onlyOwner whenNotPaused {
        require(pauseRequestTime != 0, "No pause requested");
        require(block.timestamp >= pauseRequestTime + PAUSE_DELAY, "Timelock active");
        pauseRequestTime = 0; // Reset
        _pause();
    }
    
    /**
     * @notice Cancela un request de pausa pendiente.
     */
    function cancelPauseRequest() external onlyOwner {
        require(pauseRequestTime != 0, "No pause requested");
        pauseRequestTime = 0;
        emit PauseRequestCancelled();
    }
    
    /**
     * @notice Solicita despausar el contrato. Se ejecutará después de 24h.
     */
    function requestUnpause() external onlyOwner whenPaused {
        unpauseRequestTime = block.timestamp;
        emit UnpauseRequested(block.timestamp + PAUSE_DELAY);
    }
    
    /**
     * @notice Ejecuta el unpause después de que hayan pasado 24h desde el request.
     */
    function executeUnpause() external onlyOwner whenPaused {
        require(unpauseRequestTime != 0, "No unpause requested");
        require(block.timestamp >= unpauseRequestTime + PAUSE_DELAY, "Timelock active");
        unpauseRequestTime = 0; // Reset
        _unpause();
    }
    
    /**
     * @notice Cancela un request de unpause pendiente.
     */
    function cancelUnpauseRequest() external onlyOwner {
        require(unpauseRequestTime != 0, "No unpause requested");
        unpauseRequestTime = 0;
        emit UnpauseRequestCancelled();
    }
    
    // --- Parameter Lock for Regulatory Compliance ---
    
    /**
     * @notice Lock economic parameters permanently (one-time, irreversible).
     * @dev After calling this function, setBurnRate(), setTreasuryFee(),
     *      setTreasuryWallet(), and setStakingContract() will permanently revert.
     *      This ensures post-presale immutability of economic terms for regulatory compliance.
     *
     * SECURITY:    IRREVERSIBLE. Once locked, parameters cannot be changed.
     * REGULATORY:  Demonstrates commitment to fixed economic terms post-sale.
     * TIMING:      Call AFTER all addresses are configured — recommended order:
     *               1. setTreasuryWallet(BashoodTreasury)
     *               2. setStakingContract(BashoodTimelock)  ← governance pool
     *               3. lockParameters()                     ← freeze everything
     *
     * WARNING: If stakingContract is address(0) at lock time, sendToStaking()
     *          will always revert after the lock (cannot update stakingContract later).
     *          The deploy script enforces this ordering — see scripts/deploy-mainnet.cjs.
     */
    function lockParameters() external onlyOwner {
        require(!parametersLocked, "Already locked");
        parametersLocked = true;
        emit ParametersLocked(block.timestamp);
    }
}


