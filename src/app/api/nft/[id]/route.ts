import { NextRequest, NextResponse } from "next/server";

// Метаданные NFT-призов в стандартном формате ERC-721.
// Картинки лежат в public/nft/1.png … 4.png и раздаются с нашего же домена —
// IPFS не нужен. Название приза можно поменять здесь в любой момент,
// в отличие от имени контракта, которое зашито ончейн навсегда.

const PRIZES: Record<string, { name: string; description: string }> = {
  "1": {
    name: "Кофе",
    description: "Стакан бодрости от бомжа. Греет руки и душу.",
  },
  "2": {
    name: "Суши",
    description: "Роскошь по меркам подворотни. Бомж одобряет.",
  },
  "3": {
    name: "Приз бомжа",
    description: "Тот самый третий приз.",
  },
  "4": {
    name: "Подарок от бывшей",
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
      attributes: [{ trait_type: "Приз", value: prize.name }],
    },
    { headers: { "cache-control": "public, max-age=300" } }
  );
}
