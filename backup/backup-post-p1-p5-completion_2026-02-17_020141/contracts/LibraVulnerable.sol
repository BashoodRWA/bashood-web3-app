// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

/// @title LibraVulnerable - ejemplo intencionalmente vulnerable a reentrancy
contract LibraVulnerable {
    mapping(address => uint256) public balances;

    event Deposited(address indexed who, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);

    receive() external payable {}

    function deposit() external payable {
        require(msg.value > 0, "zero");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// Vulnerable withdraw: interaction before state update
    function withdraw(uint256 amount) external {
        uint256 bal = balances[msg.sender];
        require(bal >= amount, "insufficient");

        // Interaction FIRST (vulnerable)
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");

        // State update AFTER interaction -> vulnerable to reentrancy
        balances[msg.sender] = bal - amount;

        emit Withdrawn(msg.sender, amount);
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
