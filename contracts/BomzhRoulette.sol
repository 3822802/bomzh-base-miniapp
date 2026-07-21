// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhRoulette — крутилка за BMZH. Без случайности:
// каждому кошельку тиры выдаются ПО ПОРЯДКУ 1 → 2 → 3 → 4, затем круг заново.
// То есть выпадает всегда тот тир, которого в текущем круге ещё не было.
//
// Один прокрут стоит SPIN_COST BMZH, токены уходят владельцу (owner).
// Требует предварительного approve BMZH на этот контракт.
// ─────────────────────────────────────────────────────────────────────────────

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IBomzhNFT {
    function mint(address to, uint8 tier) external returns (uint256);
}

contract BomzhRoulette is Ownable {
    IERC20 public immutable token; // BMZH
    IBomzhNFT public immutable nft;

    uint8 public constant TIERS = 4;

    /// @notice Стоимость одного прокрута (по умолчанию 10 BMZH).
    uint256 public spinCost = 10 ether;

    /// @notice Сколько раз кошелёк уже крутил (определяет следующий тир).
    mapping(address => uint256) public spinsOf;

    event Spun(address indexed player, uint8 tier, uint256 tokenId, uint256 cost);
    event SpinCostUpdated(uint256 newCost);

    constructor(address owner_, address token_, address nft_) Ownable(owner_) {
        token = IERC20(token_);
        nft = IBomzhNFT(nft_);
    }

    function setSpinCost(uint256 newCost) external onlyOwner {
        spinCost = newCost;
        emit SpinCostUpdated(newCost);
    }

    /// @notice Какой тир выпадет этому кошельку следующим (для фронта).
    function nextTier(address player) external view returns (uint8) {
        return uint8(spinsOf[player] % TIERS) + 1;
    }

    /// @notice Крутить. Списывает BMZH и минтит следующий по кругу тир.
    function spin() external returns (uint8 tier, uint256 tokenId) {
        uint256 n = spinsOf[msg.sender];
        tier = uint8(n % TIERS) + 1;
        spinsOf[msg.sender] = n + 1;

        uint256 cost = spinCost;
        if (cost > 0) {
            token.transferFrom(msg.sender, owner(), cost);
        }

        tokenId = nft.mint(msg.sender, tier);
        emit Spun(msg.sender, tier, tokenId, cost);
    }
}
