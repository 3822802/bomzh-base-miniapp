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

// Sale-контракт: 1 BMZH = 1 gwei (1e9 wei).
// Покупка фиксированная: 1000 BMZH = 1e12 wei = 0.000001 ETH (микрокопейки).
// 1000 BMZH хватает на 100 прокрутов рулетки (по 10 BMZH).
// ВАЖНО: сумму задаёт приложение, а НЕ ИИ-агент.
export const BUY_TOKENS_AMOUNT = 1000n * 10n ** 18n; // 1000 BMZH
export const BUY_PAYMENT_WEI = 10n ** 12n; // 0.000001 ETH

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
  sale: "0x362e59F89b46C685AD47CE76e4399EDBF1a09273" as `0x${string}` | "",
  roulette: "0x87e546A90E5a0E69048068f08c433679BE25643a" as `0x${string}` | "",
  // Четыре отдельных контракта призов (BomzhPrizeNFT), у каждого своя картинка
  prize1: "0x5933dd22E94095BCa20E7E045D119a70e64315ba" as `0x${string}` | "", // Кофе
  prize2: "0xD436dc7d443B5408B88B4DFd9c57697099818113" as `0x${string}` | "", // Суши
  prize3: "0xa3dbCc441D267b20695218413aBaEe96a6528D69" as `0x${string}` | "",
  prize4: "0xBA35B3F48a6887050A3149C00DBf6237FACf93d6" as `0x${string}` | "", // Подарок от бывшей
} as const;

/// Названия призов — для интерфейса. Индекс = номер приза в контракте (1..4).
/// Те же названия дублируются в src/components/Wheel.tsx (подписи секторов)
/// и в src/app/api/nft/[id]/route.ts (метаданные NFT).
export const PRIZE_NAMES = [
  "",
  "TIER 1",
  "TIER 2",
  "TIER 3",
  "ПОДАРОК ОТ БЫВШЕЙ",
] as const;

/// Стоимость одного прокрута рулетки (должна совпадать с spinCost в контракте)
export const SPIN_COST_BMZH = 10n * 10n ** 18n;

// ── Явные лимиты газа ──────────────────────────────────────────────────────
// BMZH — это B20-прекомпайл (адрес 0xB200…), и некоторые кошельки принимают его
// за обычный ERC-20 и занижают лимит: транзакция падает с "out of gas".
// Замеры через eth_estimateGas: approve ≈ 46k, buy ≈ 59k, transfer ≈ 56k.
// Ставим лимит с большим запасом. Это НЕ увеличивает стоимость: на Base платишь
// за израсходованный газ, лимит — только потолок.
export const GAS = {
  approve: 150_000n,
  buy: 200_000n,
  spin: 500_000n, // transferFrom + минт NFT (_safeMint) + события
} as const;

// x402: живой бесключевой сервис на Base mainnet ($0.001 USDC за вызов).
// Агент дёргает его как ПОКУПАТЕЛЬ — ключи и фасилитатор с нашей стороны не нужны.
export const X402_ENDPOINT =
  "https://x402-api.fly.dev/api/price-feed" as const;
