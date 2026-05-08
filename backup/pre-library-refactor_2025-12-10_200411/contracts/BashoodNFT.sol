// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BashoodNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _tokenIds;
    string private constant BASE = "https://bashood.org/nft/valhalla/";

    constructor() ERC721("BashoodNFT", "BHNFT") Ownable(msg.sender) {}

    function mintNFT(address to, string memory /*uri*/) public returns (uint256) {
        if (msg.sender != owner()) {
            revert("Not authorized");
        }
        if (to == address(0)) {
            revert("ERC721: mint to the zero address");
        }
        _tokenIds += 1;
        uint256 newId = _tokenIds;
        _mint(to, newId);
        return newId;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // Reuse OpenZeppelin's ownership check which reverts for nonexistent tokens
        _requireOwned(tokenId);
        if (tokenId == 1) {
            return string(abi.encodePacked(BASE, "1.json"));
        }
        return string(abi.encodePacked(BASE, tokenId.toString(), ".json"));
    }
}
