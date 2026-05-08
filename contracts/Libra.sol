// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

/// @title Libra - ejemplo de contrato con ReentrancyGuard
/// @notice Implementa un guard anti-reentrancy y funciones básicas de depósito/retiro
contract Libra {
    // Simple ReentrancyGuard implementation (inspirado en OpenZeppelin)
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // Simple ledger
    mapping(address => uint256) private _balances;

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);

    /// @notice Deposita ETH en el contrato y se registra el balance
    function deposit() external payable {
        require(msg.value > 0, "Libra: zero deposit");
        _balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Retira `amount` hacia msg.sender. Protegido contra reentrancy.
    /// @dev Actualiza el estado antes de la llamada externa y usa nonReentrant.
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Libra: zero withdraw");
        uint256 bal = _balances[msg.sender];
        require(bal >= amount, "Libra: insufficient balance");

        // Effects
        _balances[msg.sender] = bal - amount;

        // Interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Libra: transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Consulta el balance guardado para una cuenta
    function balanceOf(address who) external view returns (uint256) {
        return _balances[who];
    }

    /// @notice Balance total del contrato
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
