// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BashoodPaymentSplitter
 * @notice Distribuye fondos de preventa automáticamente entre 4 wallets
 * @dev Implementación simplificada de PaymentSplitter
 * 
 * Distribución:
 * - 45% Development (auditorías, desarrollo, legal)
 * - 25% Operations (salarios, gas, infraestructura)
 * - 20% Marketing (community, influencers, ads)
 * - 10% Treasury (reserva emergencia + liquidez DEX)
 */
contract BashoodPaymentSplitter {
    // Eventos
    event FundsReceived(address indexed from, uint256 amount);
    event FundsDistributed(address indexed to, uint256 amount);
    event PayeeAdded(address indexed account, uint256 shares);
    event PaymentReleased(address indexed to, uint256 amount);
    
    uint256 private _totalShares;
    uint256 private _totalReleased;
    
    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _released;
    address[] private _payees;
    
    /**
     * @notice Constructor que establece los beneficiarios y sus shares
     * @param payees Array de addresses de los beneficiarios
     * @param shares_ Array de shares para cada beneficiario
     */
    constructor(address[] memory payees, uint256[] memory shares_) {
        require(payees.length == shares_.length, "PaymentSplitter: payees and shares length mismatch");
        require(payees.length > 0, "PaymentSplitter: no payees");

        for (uint256 i = 0; i < payees.length; i++) {
            _addPayee(payees[i], shares_[i]);
        }
    }
    
    /**
     * @dev Añade un nuevo payee
     */
    function _addPayee(address account, uint256 shares_) private {
        require(account != address(0), "PaymentSplitter: account is the zero address");
        require(shares_ > 0, "PaymentSplitter: shares are 0");
        require(_shares[account] == 0, "PaymentSplitter: account already has shares");

        _payees.push(account);
        _shares[account] = shares_;
        _totalShares += shares_;
        emit PayeeAdded(account, shares_);
    }
    
    /**
     * @notice Getter para shares de un payee
     */
    function shares(address account) public view returns (uint256) {
        return _shares[account];
    }
    
    /**
     * @notice Getter para total de shares
     */
    function totalShares() public view returns (uint256) {
        return _totalShares;
    }
    
    /**
     * @notice Getter para total released
     */
    function totalReleased() public view returns (uint256) {
        return _totalReleased;
    }
    
    /**
     * @notice Getter para released de un payee
     */
    function released(address account) public view returns (uint256) {
        return _released[account];
    }
    
    /**
     * @notice Getter para un payee específico
     */
    function payee(uint256 index) public view returns (address) {
        return _payees[index];
    }
    
    /**
     * @notice Retorna el monto releasable para un account
     */
    function releasable(address account) public view returns (uint256) {
        uint256 totalReceived = address(this).balance + _totalReleased;
        return _pendingPayment(account, totalReceived, released(account));
    }
    
    /**
     * @dev Calcula el pago pendiente para un account
     */
    function _pendingPayment(
        address account,
        uint256 totalReceived,
        uint256 alreadyReleased
    ) private view returns (uint256) {
        return (totalReceived * _shares[account]) / _totalShares - alreadyReleased;
    }
    
    /**
     * @notice Recibe ETH de la preventa
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
    
    /**
     * @notice Libera fondos pendientes a una wallet
     */
    function release(address payable account) public {
        require(_shares[account] > 0, "PaymentSplitter: account has no shares");

        uint256 payment = releasable(account);
        require(payment != 0, "PaymentSplitter: account is not due payment");

        _released[account] += payment;
        _totalReleased += payment;

        (bool success, ) = account.call{value: payment}("");
        require(success, "PaymentSplitter: payment failed");
        
        emit PaymentReleased(account, payment);
        emit FundsDistributed(account, payment);
    }
    
    /**
     * @notice Libera fondos a todas las wallets de una vez
     */
    function releaseAll() external {
        uint256 len = _payees.length;
        for (uint256 i = 0; i < len; i++) {
            address payable account = payable(_payees[i]);
            uint256 payment = releasable(account);
            
            if (payment > 0) {
                _released[account] += payment;
                _totalReleased += payment;

                (bool success, ) = account.call{value: payment}("");
                require(success, "PaymentSplitter: payment failed");
                
                emit PaymentReleased(account, payment);
                emit FundsDistributed(account, payment);
            }
        }
    }
    
    /**
     * @notice Retorna información completa de distribución
     */
    function getDistributionInfo() external view returns (
        address[] memory wallets,
        uint256[] memory percentages,
        uint256[] memory pending,
        uint256[] memory released_
    ) {
        uint256 len = _payees.length;
        wallets = new address[](len);
        percentages = new uint256[](len);
        pending = new uint256[](len);
        released_ = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            address account = _payees[i];
            wallets[i] = account;
            percentages[i] = _shares[account];
            pending[i] = releasable(account);
            released_[i] = _released[account];
        }
    }
}
