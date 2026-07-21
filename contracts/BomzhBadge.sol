// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhBadge — ERC-721 бейджи за достижения в уходе за бомжом.
// Два вида:
//   KIND_FIRST_FEED (1) — за первое кормление
//   KIND_STREAK_5   (2) — за 5 дней кормления подряд
// Минтит ТОЛЬКО контракт BomzhCare (minter). Метаданные зальём позже.
//
// OpenZeppelin v5 подтягивается Remix'ом по npm-путям.
// ─────────────────────────────────────────────────────────────────────────────

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BomzhBadge is ERC721, Ownable {
    uint8 public constant KIND_FIRST_FEED = 1;
    uint8 public constant KIND_STREAK_5 = 2;
    uint8 public constant KINDS = 2;

    address public minter; // адрес BomzhCare
    uint256 public nextId = 1;

    mapping(uint256 => uint8) public kindOf; // tokenId => вид бейджа
    mapping(uint8 => string) public kindURI; // вид => URI метаданных

    event MinterUpdated(address indexed minter);
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint8 kind);

    error NotMinter();
    error BadKind(uint8 kind);

    constructor(address owner_)
        ERC721("Bomzh Badge", "BMZHB")
        Ownable(owner_)
    {}

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @notice Разрешить минт контракту ухода (вызвать после деплоя BomzhCare).
    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterUpdated(m);
    }

    /// @notice Задать URI метаданных для вида бейджа (когда будет арт).
    function setKindURI(uint8 kind, string calldata uri) external onlyOwner {
        if (kind == 0 || kind > KINDS) revert BadKind(kind);
        kindURI[kind] = uri;
    }

    /// @notice Минт бейджа. Только BomzhCare.
    function mint(address to, uint8 kind) external onlyMinter returns (uint256 id) {
        if (kind == 0 || kind > KINDS) revert BadKind(kind);
        id = nextId++;
        kindOf[id] = kind;
        _safeMint(to, id);
        emit BadgeMinted(to, id, kind);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return kindURI[kindOf[tokenId]]; // пусто, пока URI не задан
    }
}
