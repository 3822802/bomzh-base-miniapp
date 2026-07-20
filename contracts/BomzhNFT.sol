// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhNFT — ERC-721 с 4 тирами для рулетки «Лудить». Минтит выпавший тир.
// Минт разрешён ТОЛЬКО контракту рулетки (minter). См. Фаза C, шаг 8.
// Метаданные (арт/названия тиров) зальём позже — tierURI задаётся владельцем.
//
// OpenZeppelin v5 подтягивается Remix'ом по npm-путям @openzeppelin/contracts.
// ─────────────────────────────────────────────────────────────────────────────

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BomzhNFT is ERC721, Ownable {
    uint8 public constant TIERS = 4;

    address public minter; // адрес BomzhRoulette
    uint256 public nextId = 1;

    mapping(uint256 => uint8) public tierOf; // tokenId => тир (1..4)
    mapping(uint8 => string) public tierURI; // тир => URI метаданных

    event MinterUpdated(address indexed minter);
    event TierMinted(address indexed to, uint256 indexed tokenId, uint8 tier);

    error NotMinter();
    error BadTier(uint8 tier);

    constructor(address owner_)
        ERC721("Bomzh Loot", "BOMZHNFT")
        Ownable(owner_)
    {}

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @notice Разрешить минт контракту рулетки (вызвать после деплоя рулетки).
    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterUpdated(m);
    }

    /// @notice Задать/обновить URI метаданных тира (когда будет готов арт).
    function setTierURI(uint8 tier, string calldata uri) external onlyOwner {
        if (tier == 0 || tier > TIERS) revert BadTier(tier);
        tierURI[tier] = uri;
    }

    /// @notice Минт выпавшего тира. Только рулетка.
    function mint(address to, uint8 tier) external onlyMinter returns (uint256 id) {
        if (tier == 0 || tier > TIERS) revert BadTier(tier);
        id = nextId++;
        tierOf[id] = tier;
        _safeMint(to, id);
        emit TierMinted(to, id, tier);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return tierURI[tierOf[tokenId]]; // пусто, пока URI тира не задан
    }
}
