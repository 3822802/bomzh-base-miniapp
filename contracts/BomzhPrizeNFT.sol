// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhPrizeNFT — приз рулетки. ОДИН контракт = ОДИН вид приза.
// Деплоится 4 раза, у каждого своё имя, символ и картинка.
//
// Минтить может только контракт рулетки (minter).
// Пример деплоя (аргументы конструктора):
//   1) owner, "Bomzh Kartonka",   "BMZH1", "ipfs://.../1.json"
//   2) owner, "Bomzh Vatnik",     "BMZH2", "ipfs://.../2.json"
//   3) owner, "Bomzh Telezhka",   "BMZH3", "ipfs://.../3.json"
//   4) owner, "Bomzh Zolotoy",    "BMZH4", "ipfs://.../4.json"
// URI можно задать позже через setTokenURI — арта пока нет.
// ─────────────────────────────────────────────────────────────────────────────

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BomzhPrizeNFT is ERC721, Ownable {
    address public minter; // адрес BomzhRoulette
    uint256 public nextId = 1;

    /// @notice Общий URI метаданных для всех токенов этого приза.
    string private _uri;

    event MinterUpdated(address indexed minter);
    event PrizeMinted(address indexed to, uint256 indexed tokenId);

    error NotMinter();

    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        _uri = uri_;
    }

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @notice Разрешить минт контракту рулетки (вызвать после её деплоя).
    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterUpdated(m);
    }

    /// @notice Задать/обновить картинку и метаданные приза.
    function setTokenURI(string calldata uri_) external onlyOwner {
        _uri = uri_;
    }

    /// @notice Минт приза. Только рулетка.
    function mint(address to) external onlyMinter returns (uint256 id) {
        id = nextId++;
        _safeMint(to, id);
        emit PrizeMinted(to, id);
    }

    /// @dev У всех токенов одного приза одна и та же картинка.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _uri;
    }
}
