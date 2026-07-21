// ─────────────────────────────────────────────────────────────
// Единый источник реквизитов проекта Bomzh (см. PROJECT_Bomzh_full.md, ЧАСТЬ 1)
// Подставлять эти значения ВЕЗДЕ — не хардкодить по месту.
// ─────────────────────────────────────────────────────────────

// Основной прогретый кошелёк: owner / creator / admin токена /
// получатель ETH-выручки sale / получатель x402.
export const OWNER_ADDRESS =
  "0x428918fA22db0F356f977136bB0E06C6F7db7559" as const;

export const BASENAME = "40m04u.base.eth" as const;

// Builder-код — атрибуция билдера. Идёт в:
// • регистрацию апки на Base.dev (поле builder code)
// • манифест/конфиг MiniKit
// • dataSuffix у onchain-вызовов (хвост калдаты для атрибуции)
export const BUILDER_CODE = "bc_3kvzpilt" as const;
export const BUILDER_DATA_SUFFIX =
  "0x62635f336b767a70696c740b0080218021802180218021802180218021" as const;

// Сеть Base mainnet
export const BASE_CHAIN_ID = 8453 as const;
export const BASE_RPC_URL = "https://mainnet.base.org" as const;

// Параметры токена (B20, вариант ASSET)
export const TOKEN = {
  name: "Bomzh",
  symbol: "BMZH",
  decimals: 18,
  // 1 000 000 * 1e18
  supplyCap: 1_000_000n * 10n ** 18n,
} as const;

// Sale-контракт: фикс-цена ~0.0000001 ETH за 1 BMZH
export const SALE_PRICE_ETH_PER_BMZH = "0.0000001" as const;

// x402-гейт на спин рулетки: $0.02 USDC (получатель — OWNER_ADDRESS)
export const SPIN_PRICE_USDC = "0.02" as const;

// Справочные адреса B20 (ЧАСТЬ 8)
export const B20_FACTORY =
  "0xB20f000000000000000000000000000000000000" as const;
export const ACTIVATION_REGISTRY =
  "0x8453000000000000000000000000000000000001" as const;

// Адреса собственных контрактов — заполняются по мере деплоя (Фаза B/C)
export const CONTRACTS = {
  // B20 Bomzh (BMZH), создан через обёртку в Remix
  token: "0xB200000000000000000000873a5F3745D420D7C9" as `0x${string}` | "",
  // Обёртка-фабрика B20 (деплой Remix) — для истории/верификации
  tokenFactory: "0x477Eb694f91E058B68dd6Bb3E303d91917196e52" as `0x${string}` | "",
  sale: "" as `0x${string}` | "", // sale-контракт (фикс-цена)
  roulette: "" as `0x${string}` | "", // BomzhRoulette — прокрут за BMZH
  nft: "" as `0x${string}` | "", // BomzhNFT — 4 тира
} as const;

/// Стоимость одного прокрута рулетки (должна совпадать с spinCost в контракте)
export const SPIN_COST_BMZH = 10n * 10n ** 18n;

// x402: живой бесключевой сервис на Base mainnet ($0.001 USDC за вызов).
// Агент дёргает его как ПОКУПАТЕЛЬ — ключи и фасилитатор с нашей стороны не нужны.
export const X402_ENDPOINT =
  "https://x402-api.fly.dev/api/price-feed" as const;
