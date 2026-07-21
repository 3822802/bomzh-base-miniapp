// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhRoulette — крутилка за BMZH. Без случайности:
// каждому кошельку призы выдаются ПО ПОРЯДКУ 1 → 2 → 3 → 4, затем круг заново.
//
// Призы — ЧЕТЫРЕ отдельных NFT-контракта (BomzhPrizeNFT), у каждого своя
// картинка и название. Рулетка минтит из нужного по счётчику прокрутов.
//
// Один прокрут стоит spinCost BMZH, токены уходят владельцу.
// Требует предварительного approve BMZH на этот контракт.
// ─────────────────────────────────────────────────────────────────────────────

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IBomzhPrizeNFT {
    function mint(address to) external returns (uint256);
}

contract BomzhRoulette is Ownable {
    IERC20 public immutable token; // BMZH

    uint8 public constant PRIZES = 4;

    /// @notice Четыре контракта призов, по индексу 0..3 (приз 1..4).
    IBomzhPrizeNFT[PRIZES] public prizes;

    /// @notice Стоимость одного прокрута (по умолчанию 10 BMZH).
    uint256 public spinCost = 10 ether;

    /// @notice Сколько раз кошелёк уже крутил (определяет следующий приз).
    mapping(address => uint256) public spinsOf;

    event Spun(address indexed player, uint8 prize, address nft, uint256 tokenId, uint256 cost);
    event SpinCostUpdated(uint256 newCost);

    constructor(
        address owner_,
        address token_,
        address prize1,
        address prize2,
        address prize3,
        address prize4
    ) Ownable(owner_) {
        token = IERC20(token_);
        prizes[0] = IBomzhPrizeNFT(prize1);
        prizes[1] = IBomzhPrizeNFT(prize2);
        prizes[2] = IBomzhPrizeNFT(prize3);
        prizes[3] = IBomzhPrizeNFT(prize4);
    }

    function setSpinCost(uint256 newCost) external onlyOwner {
        spinCost = newCost;
        emit SpinCostUpdated(newCost);
    }

    /// @notice Какой приз (1..4) выпадет этому кошельку следующим.
    function nextPrize(address player) external view returns (uint8) {
        return uint8(spinsOf[player] % PRIZES) + 1;
    }

    /// @notice Адрес NFT-контракта приза по номеру 1..4 (для фронта).
    function prizeContract(uint8 prize) external view returns (address) {
        require(prize >= 1 && prize <= PRIZES, "bad prize");
        return address(prizes[prize - 1]);
    }

    /// @notice Крутить. Списывает BMZH и минтит следующий по кругу приз.
    function spin() external returns (uint8 prize, uint256 tokenId) {
        uint256 n = spinsOf[msg.sender];
        uint8 idx = uint8(n % PRIZES);
        prize = idx + 1;
        spinsOf[msg.sender] = n + 1;

        uint256 cost = spinCost;
        if (cost > 0) {
            token.transferFrom(msg.sender, owner(), cost);
        }

        IBomzhPrizeNFT nft = prizes[idx];
        tokenId = nft.mint(msg.sender);
        emit Spun(msg.sender, prize, address(nft), tokenId, cost);
    }
}
