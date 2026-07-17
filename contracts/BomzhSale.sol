// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhSale — sale-контракт с ФИКС-ценой для кнопки «Купить» (агент Бомж).
// Продаёт BMZH по ~0.0000001 ETH за 1 токен. ETH-выручка идёт владельцу.
// Контракт предзаливается частью supply BMZH (владелец переводит на его адрес).
// См. PROJECT_Bomzh_full.md ЧАСТЬ 0 и Фаза C, шаг 7.
//
// Токен BMZH (B20 ASSET) для перевода ведёт себя как ERC-20 — хватает transfer.
// ─────────────────────────────────────────────────────────────────────────────

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BomzhSale {
    // Токен и получатель выручки задаются при деплое.
    IERC20 public immutable token;
    address public immutable owner; // получатель ETH-выручки (кошелёк владельца)

    // Цена: 0.0000001 ETH за 1 BMZH (целый токен = 1e18 юнитов).
    // 0.0000001 ETH = 1e11 wei за 1e18 юнитов BMZH.
    uint256 public constant PRICE_WEI_PER_TOKEN = 1e11;

    event Bought(address indexed buyer, uint256 ethIn, uint256 tokensOut);
    event Swept(address indexed to, uint256 tokensOut);

    error ZeroValue();
    error InsufficientStock(uint256 requested, uint256 available);
    error PayoutFailed();
    error NotOwner();

    constructor(address token_, address owner_) {
        token = IERC20(token_);
        owner = owner_;
    }

    /// @notice Купить BMZH за ETH. Кол-во токенов считается от суммы ETH.
    /// tokensOut(юниты) = msg.value * 1e18 / PRICE_WEI_PER_TOKEN.
    function buy() external payable {
        if (msg.value == 0) revert ZeroValue();

        uint256 tokensOut = (msg.value * 1e18) / PRICE_WEI_PER_TOKEN;
        uint256 stock = token.balanceOf(address(this));
        if (tokensOut > stock) revert InsufficientStock(tokensOut, stock);

        // ETH-выручку сразу пересылаем владельцу (контракт не копит ETH).
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

    /// @notice Предпросмотр: сколько BMZH дадут за указанный ETH (в wei).
    function quote(uint256 ethWei) external pure returns (uint256 tokensOut) {
        return (ethWei * 1e18) / PRICE_WEI_PER_TOKEN;
    }
}
