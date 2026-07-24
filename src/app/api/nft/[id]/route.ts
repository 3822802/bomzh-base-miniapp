import { NextRequest, NextResponse } from "next/server";

// Метаданные NFT-призов в стандартном формате ERC-721.
// Картинки лежат в public/nft/1.png … 4.png и раздаются с нашего же домена —
// IPFS не нужен. Тексты здесь можно менять когда угодно, в отличие от имени
// контракта, которое зашито ончейн навсегда.

const COLLECTION = "Bomzh Hunter";

// Канонический адрес сайта. Важно: в setTokenURI ончейн зашивается конкретный
// домен, и метаданные должны ссылаться на тот же самый. Vercel отдаёт для
// каждого деплоя ещё и уникальный технический URL — если брать origin запроса,
// картинка у части токенов уедет на превью-домен, который потом умрёт.
// Поэтому предпочитаем явно заданный домен, а origin — только как запасной.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

const PRIZES: Record<
  string,
  { name: string; tier: string; rarity: string; description: string }
> = {
  "1": {
    name: "TIER 1",
    tier: "Bronze",
    rarity: "Common",
    description:
      "Базовый тир Bomzh Hunter. С него начинают все — и с него же начинается путь к остальным трём.",
  },
  "2": {
    name: "TIER 2",
    tier: "Silver",
    rarity: "Uncommon",
    description: "Второй тир Bomzh Hunter. Уже не новичок.",
  },
  "3": {
    name: "TIER 3",
    tier: "Gold",
    rarity: "Rare",
    description: "Третий тир Bomzh Hunter. Редкая находка.",
  },
  "4": {
    name: "ПОДАРОК ОТ БЫВШЕЙ",
    tier: "Special",
    rarity: "Legendary",
    description: "Финальный приз Bomzh Hunter. Лучше бы не открывал.",
  },
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const prize = PRIZES[id];

  if (!prize) {
    return NextResponse.json({ error: "нет такого приза" }, { status: 404 });
  }

  const base = SITE_URL ?? req.nextUrl.origin;

  return NextResponse.json(
    {
      name: `${COLLECTION} — ${prize.name}`,
      description: prize.description,
      image: `${base}/nft/${id}.png`,
      // Ссылка на саму апку: маркетплейсы показывают её кнопкой у токена.
      external_url: base,
      attributes: [
        { trait_type: "Collection", value: COLLECTION },
        { trait_type: "Tier", value: prize.tier },
        { trait_type: "Rarity", value: prize.rarity },
        { trait_type: "Prize", value: prize.name },
      ],
    },
    {
      // Метаданные меняются редко; сутки в кэше + сутки stale, чтобы
      // маркетплейсы и кошельки не дёргали маршрут на каждый показ.
      headers: {
        "cache-control":
          "public, max-age=86400, stale-while-revalidate=86400",
      },
    }
  );
}
