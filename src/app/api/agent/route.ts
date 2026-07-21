import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// ИИ-агент Бомж. Умеет ровно две вещи, и обе — через инструменты:
//   buy_token  — купить BMZH за ETH (sale-контракт)
//   x402_touch — сделать x402-касание ($0.001 USDC)
//
// ВАЖНО: сервер сам ничего не исполняет. Оба действия требуют кошелька юзера,
// поэтому агент только РЕШАЕТ, что вызвать, а выполняет фронтенд.
// Модель — Haiku 4.5 (самая дешёвая), ответы короткие: расход токенов минимальный.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM = `Ты — ИИ-агент «Бомж» в мини-аппе на сети Base. Отвечай по-русски, коротко (одна-две фразы), в образе бродяги: просто, с юмором, без пафоса.

Ты умеешь ровно две вещи, и только через инструменты:
1. buy_token — купить пользователю токен BMZH за ETH.
2. x402_touch — сделать x402-запрос (микроплатёж 0.001 USDC).

Если просят что-то другое — честно скажи, что больше ничего не умеешь, и предложи одно из двух.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buy_token",
    description:
      "Купить токен BMZH за ETH через sale-контракт. Вызывай, когда пользователь просит купить токен, купить бомжей или пополнить баланс BMZH.",
    input_schema: {
      type: "object",
      properties: {
        eth_amount: {
          type: "string",
          description:
            'Сколько ETH потратить, строкой, например "0.00001". Если пользователь не назвал сумму — верни "0.00001".',
        },
      },
      required: [],
    },
  },
  {
    name: "x402_touch",
    description:
      "Сделать x402-касание: платный HTTP-запрос за 0.001 USDC на Base. Вызывай, когда просят сделать x402, касание или платный запрос.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не задан в .env.local" },
      { status: 503 }
    );
  }

  let message = "";
  try {
    const body = await req.json();
    message = typeof body?.message === "string" ? body.message : "";
  } catch {
    return NextResponse.json({ error: "ожидается JSON" }, { status: 400 });
  }
  if (!message.trim()) {
    return NextResponse.json({ error: "пустое сообщение" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300, // ответы короткие — держим расход минимальным
      system: SYSTEM,
      tools: TOOLS,
      messages: [{ role: "user", content: message }],
    });

    let text = "";
    let action: { tool: string; input: Record<string, unknown> } | null = null;

    for (const block of res.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        action = {
          tool: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        };
      }
    }

    return NextResponse.json({ text: text.trim(), action });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "неверный ANTHROPIC_API_KEY" }, { status: 502 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "лимит запросов, попробуй позже" }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `ошибка API: ${e.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "неизвестная ошибка" }, { status: 500 });
  }
}
