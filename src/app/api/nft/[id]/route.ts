import { NextRequest, NextResponse } from "next/server";

// Метаданные NFT-призов в стандартном формате ERC-721.
// Картинки лежат в public/nft/1.png … 4.png и раздаются с нашего же домена —
// IPFS не нужен. Название приза можно поменять здесь в любой момент,
// в отличие от имени контракта, которое зашито ончейн навсегда.

const PRIZES: Record<string, { name: string; tier: string; description: string }> = {
  "1": {
    name: "TIER 1",
    tier: "Bronze",
    description: "Базовый тир Аирдроп Хантера. С него начинают все.",
  },
  "2": {
    name: "TIER 2",
    tier: "Silver",
    description: "Второй тир. Уже не новичок.",
  },
  "3": {
    name: "TIER 3",
    tier: "Gold",
    description: "Третий тир. Редкая находка.",
  },
  "4": {
    name: "ПОДАРОК ОТ БЫВШЕЙ",
    tier: "Special",
    description: "Лучше бы не открывал.",
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

  return NextResponse.json(
    {
      name: prize.name,
      description: prize.description,
      image: `${req.nextUrl.origin}/nft/${id}.png`,
      attributes: [
        { trait_type: "Tier", value: prize.tier },
        { trait_type: "Приз", value: prize.name },
      ],
    },
    { headers: { "cache-control": "public, max-age=300" } }
  );
}
