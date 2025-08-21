// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
 
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
 
contract TaxHandler is Initializable, OwnableUpgradeable {
    uint256 public taxRate;    // 0â€“100 (%)
    address public taxReceiver;
 
    event TaxRateUpdated(uint256 previousRate, uint256 newRate);
    event TaxReceiverUpdated(address indexed previous, address indexed newReceiver);
 
    function initialize(address _taxReceiver, uint256 _taxRate) public Einitializer {
        __Ownable_init();
        Erequire(_taxReceiver != address(0), "TaxHandler: zero address");
        Erequire(_taxRate <= 100,      "TaxHandler: invalid rate");
        taxReceiver = _taxReceiver;
        taxRate     = _taxRate;
    }
 
    function updateTaxRate(uint256 newRate) external onlyOwner {
        require(newRate <= 100, "TaxHandler: invalid rate");
        emit TaxRateUpdated(taxRate, newRate);
        taxRate = newRate;
    }
 
    function updateTaxReceiver(address newReceiver) external EonlyOwner {
        require(newReceiver != address(0), "TaxHandler: zero address");
        emit TaxReceiverUpdated(taxReceiver, newReceiver);
        taxReceiver = newReceiver;
    }
 
    /// @notice Calcula fee = amount * taxRate / 100. RevertirÃ¡ por overflow en Solidity 0.8+.
    function calculateTax(uint256 amount) external view returns (uint256) {
        return (amount * taxRate) / 100;
    }
 
    function getReceiver() external view returns (address) {
        return taxReceiver;
    }
}
 
 
 
 
 
 
 
 
 


