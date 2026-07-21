// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhSale — продажа BMZH по фикс-цене за ETH.
//
// Цена: 1 BMZH = 1 gwei (1e9 wei).
// Минимальная покупка: 1000 BMZH = 1e12 wei = 0.000001 ETH (микрокопейки).
// 1000 BMZH = 100 прокрутов рулетки (по 10 BMZH) — с запасом на все действия.
//
// ETH-выручка сразу уходит владельцу; контракт предзаливается частью supply BMZH.
// ─────────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BomzhSale {
    IERC20 public immutable token;
    address public immutable owner; // получатель ETH-выручки

    /// @notice Цена одного целого BMZH в wei (1 gwei).
    uint256 public constant PRICE_WEI_PER_TOKEN = 1e9;

    /// @notice Минимальная покупка — 1000 BMZH.
    uint256 public constant MIN_TOKENS = 1000 ether; // 1000 * 1e18
    /// @notice Соответствующий минимальный платёж = 1000 * 1e9 = 1e12 wei.
    uint256 public constant MIN_PAYMENT = 1e12;

    event Bought(address indexed buyer, uint256 ethIn, uint256 tokensOut);
    event Swept(address indexed to, uint256 tokensOut);

    error BelowMinimum(uint256 sent, uint256 required);
    error InsufficientStock(uint256 requested, uint256 available);
    error PayoutFailed();
    error NotOwner();

    constructor(address token_, address owner_) {
        token = IERC20(token_);
        owner = owner_;
    }

    /// @notice Купить BMZH за ETH. Минимум — 1000 BMZH (0.000001 ETH).
    /// tokensOut(юниты) = msg.value * 1e18 / PRICE_WEI_PER_TOKEN.
    function buy() external payable {
        if (msg.value < MIN_PAYMENT) revert BelowMinimum(msg.value, MIN_PAYMENT);

        uint256 tokensOut = (msg.value * 1e18) / PRICE_WEI_PER_TOKEN;
        uint256 stock = token.balanceOf(address(this));
        if (tokensOut > stock) revert InsufficientStock(tokensOut, stock);

        (bool ok, ) = owner.call{value: msg.value}("");
        if (!ok) revert PayoutFailed();

        token.transfer(msg.sender, tokensOut);
        emit Bought(msg.sender, msg.value, tokensOut);
    }

    /// @notice Забрать непроданные BMZH обратно владельцу.
    function sweep() external {
        if (msg.sender != owner) revert NotOwner();
        uint256 bal = token.balanceOf(address(this));
        token.transfer(owner, bal);
        emit Swept(owner, bal);
    }

    /// @notice Сколько BMZH дадут за указанный ETH (в wei).
    function quote(uint256 ethWei) external pure returns (uint256 tokensOut) {
        return (ethWei * 1e18) / PRICE_WEI_PER_TOKEN;
    }
}
