// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhCare — ядро апки: «покормить бомжа».
// Каждое кормление — вызов этого контракта (с builder-суффиксом на фронте),
// тратит немного BMZH и ведёт ончейн-состояние: стрик, всего кормлений.
//
// Бейджи выдаются автоматически:
//   1-е кормление        -> BomzhBadge.KIND_FIRST_FEED (1)
//   5 дней подряд        -> BomzhBadge.KIND_STREAK_5   (2)
//
// Кормить можно раз в сутки (сутки = block.timestamp / 1 days).
// ─────────────────────────────────────────────────────────────────────────────

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IBomzhBadge {
    function mint(address to, uint8 kind) external returns (uint256);
}

contract BomzhCare is Ownable {
    IERC20 public immutable token; // BMZH
    IBomzhBadge public immutable badge;

    uint8 private constant KIND_FIRST_FEED = 1;
    uint8 private constant KIND_STREAK_5 = 2;
    uint32 public constant STREAK_TARGET = 5;

    /// @notice Сколько BMZH стоит одно кормление (по умолчанию 10 BMZH).
    uint256 public feedCost = 10 ether;

    struct State {
        uint64 lastDay; // номер суток последнего кормления
        uint32 streak; // дней подряд
        uint32 totalFeeds; // всего кормлений
    }

    mapping(address => State) public stateOf;
    mapping(address => mapping(uint8 => bool)) public hasBadge;

    event Fed(address indexed user, uint32 streak, uint32 totalFeeds, uint256 cost);
    event FeedCostUpdated(uint256 newCost);

    error AlreadyFedToday();

    constructor(address owner_, address token_, address badge_) Ownable(owner_) {
        token = IERC20(token_);
        badge = IBomzhBadge(badge_);
    }

    function setFeedCost(uint256 newCost) external onlyOwner {
        feedCost = newCost;
        emit FeedCostUpdated(newCost);
    }

    /// @notice Текущие сутки (для фронта — понять, можно ли кормить).
    function today() public view returns (uint64) {
        return uint64(block.timestamp / 1 days);
    }

    /// @notice Можно ли этому юзеру кормить прямо сейчас.
    function canFeed(address user) external view returns (bool) {
        return today() > stateOf[user].lastDay;
    }

    /// @notice Покормить бомжа. Раз в сутки. Требует approve BMZH на feedCost.
    function feed() external {
        State storage s = stateOf[msg.sender];
        uint64 d = today();
        if (d <= s.lastDay) revert AlreadyFedToday();

        // стрик: продолжается, только если кормили ровно вчера
        s.streak = (s.lastDay != 0 && d == s.lastDay + 1) ? s.streak + 1 : 1;
        s.lastDay = d;
        s.totalFeeds += 1;

        uint256 cost = feedCost;
        if (cost > 0) {
            token.transferFrom(msg.sender, owner(), cost);
        }

        emit Fed(msg.sender, s.streak, s.totalFeeds, cost);

        // бейдж за первое кормление
        if (s.totalFeeds == 1 && !hasBadge[msg.sender][KIND_FIRST_FEED]) {
            hasBadge[msg.sender][KIND_FIRST_FEED] = true;
            badge.mint(msg.sender, KIND_FIRST_FEED);
        }

        // бейдж за 5 дней подряд
        if (s.streak >= STREAK_TARGET && !hasBadge[msg.sender][KIND_STREAK_5]) {
            hasBadge[msg.sender][KIND_STREAK_5] = true;
            badge.mint(msg.sender, KIND_STREAK_5);
        }
    }
}
