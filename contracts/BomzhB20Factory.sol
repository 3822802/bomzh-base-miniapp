// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// Bomzh (BMZH) — контракт-обёртка для запуска B20-токена ASSET через фабрику-
// прекомпайл Base. Обёртка нужна, потому что параметры create требуют
// КАНОНИЧЕСКОГО кодирования через B20FactoryLib — иначе фабрика вернёт
// AbiDecodeFailed. См. PROJECT_Bomzh_full.md, ЧАСТЬ 2.12 и ЧАСТЬ 3 (Фаза B).
//
// Импорты тянутся напрямую из репозитория base/base-std — Remix резолвит
// GitHub-ссылки и их относительные импорты автоматически.
// Если импорт не резолвится: см. contracts/README_REMIX.md (запасной путь).
// ─────────────────────────────────────────────────────────────────────────────

import {IB20Factory} from "https://github.com/base/base-std/blob/main/src/interfaces/IB20Factory.sol";
import {IActivationRegistry} from "https://github.com/base/base-std/blob/main/src/interfaces/IActivationRegistry.sol";
import {B20FactoryLib} from "https://github.com/base/base-std/blob/main/src/lib/B20FactoryLib.sol";
import {B20Constants} from "https://github.com/base/base-std/blob/main/src/lib/B20Constants.sol";

contract BomzhB20Factory {
    // Прекомпайлы Base (одинаковы во всех сетях) — ЧАСТЬ 8
    IB20Factory public constant FACTORY =
        IB20Factory(0xB20f000000000000000000000000000000000000);
    IActivationRegistry public constant REGISTRY =
        IActivationRegistry(0x8453000000000000000000000000000000000001);

    // Параметры токена Bomzh (ЧАСТЬ 1). Admin = прогретый кошелёк владельца.
    string public constant TOKEN_NAME = "Bomzh";
    string public constant TOKEN_SYMBOL = "BMZH";
    uint8 public constant TOKEN_DECIMALS = 18;
    address public constant ADMIN = 0x428918fA22db0F356f977136bB0E06C6F7db7559;
    uint256 public constant SUPPLY_CAP = 1_000_000 * 1e18; // 1 000 000 BMZH

    // Адрес созданного токена (заполняется после createBomzh)
    address public token;

    event BomzhCreated(address indexed token, address indexed admin);

    /// @notice Бесплатный read-чек: активирован ли стандарт B20 ASSET в сети.
    /// Вызвать ПЕРВЫМ (view, без газа) перед созданием токена.
    function isAssetActivated() external view returns (bool) {
        return REGISTRY.isActivated(keccak256("base.b20_asset"));
    }

    /// @notice Создаёт токен Bomzh через фабрику.
    /// initCalls: выдаёт MINT_ROLE владельцу + ставит supply cap 1 000 000.
    /// Роль DEFAULT_ADMIN и MINT_ROLE достаются ADMIN (EOA владельца), НЕ обёртке —
    /// поэтому минт владелец делает сам напрямую на токене: mint(ADMIN, amount).
    /// @param salt произвольные 32 байта для детерминированного адреса
    ///        (напр. 0x0000…0001; при коллизии фабрика откатит — смени salt).
    function createBomzh(bytes32 salt) public returns (address) {
        require(token == address(0), "Bomzh: already created");

        bytes memory params = B20FactoryLib.encodeAssetCreateParams(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            ADMIN,
            TOKEN_DECIMALS
        );

        bytes[] memory initCalls = new bytes[](2);
        initCalls[0] = B20FactoryLib.encodeGrantRole(B20Constants.MINT_ROLE, ADMIN);
        initCalls[1] = B20FactoryLib.encodeUpdateSupplyCap(SUPPLY_CAP);

        address t = FACTORY.createB20(
            IB20Factory.B20Variant.ASSET,
            salt,
            params,
            initCalls
        );

        token = t;
        emit BomzhCreated(t, ADMIN);
        return t;
    }

    /// @notice Удобная перегрузка с детерминированным salt из ADMIN+символа.
    function createBomzh() external returns (address) {
        return createBomzh(keccak256(abi.encodePacked(ADMIN, TOKEN_SYMBOL)));
    }
}
