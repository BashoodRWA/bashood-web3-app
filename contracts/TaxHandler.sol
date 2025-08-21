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
33×
33×
33×
33×
33×
&nbsp;
&nbsp;
&nbsp;
17×
15×
15×
&nbsp;
&nbsp;
&nbsp;
5×
2×
2×
&nbsp;
&nbsp;
&nbsp;
&nbsp;
28×
&nbsp;
&nbsp;
&nbsp;
27×
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
pragma solidity ^0.8.7;
&nbsp;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
&nbsp;
contract TaxHandler is Initializable, OwnableUpgradeable {
    uint256 public taxRate;    // 0–100 (%)
    address public taxReceiver;
&nbsp;
    event TaxRateUpdated(uint256 previousRate, uint256 newRate);
    event TaxReceiverUpdated(address indexed previous, address indexed newReceiver);
&nbsp;
    function initialize(address _taxReceiver, uint256 _taxRate) public Einitializer {
        __Ownable_init();
        Erequire(_taxReceiver != address(0), "TaxHandler: zero address");
        Erequire(_taxRate &lt;= 100,      "TaxHandler: invalid rate");
        taxReceiver = _taxReceiver;
        taxRate     = _taxRate;
    }
&nbsp;
    function updateTaxRate(uint256 newRate) external onlyOwner {
        require(newRate &lt;= 100, "TaxHandler: invalid rate");
        emit TaxRateUpdated(taxRate, newRate);
        taxRate = newRate;
    }
&nbsp;
    function updateTaxReceiver(address newReceiver) external EonlyOwner {
        require(newReceiver != address(0), "TaxHandler: zero address");
        emit TaxReceiverUpdated(taxReceiver, newReceiver);
        taxReceiver = newReceiver;
    }
&nbsp;
    /// @notice Calcula fee = amount * taxRate / 100. Revertirá por overflow en Solidity 0.8+.
    function calculateTax(uint256 amount) external view returns (uint256) {
        return (amount * taxRate) / 100;
    }
&nbsp;
    function getReceiver() external view returns (address) {
        return taxReceiver;
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
