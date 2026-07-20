// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Мини-интерфейс для минта supply на уже созданном токене BMZH через Remix.
// Токен: 0xB200000000000000000000873a5F3745D420D7C9
// Инструкция — см. README_REMIX.md, шаг 7.
interface IBomzhMint {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
