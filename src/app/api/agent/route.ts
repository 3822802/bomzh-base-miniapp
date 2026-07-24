import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// ИИ-агент Бомж — МАКСИМАЛЬНО ОГРАНИЧЕН.
//
// Модель НЕ управляет приложением и не может ничего инициировать:
//   • у неё НЕТ инструментов вообще (tools не передаются) — механизма вызова нет;
//   • на вход НЕ попадает пользовательский текст — только один из четырёх
//     фиксированных статусов из списка ниже. Поле ввода в UI отсутствует;
//   • действие уже ВЫПОЛНЕНО к моменту вызова — модель лишь озвучивает итог.
//
// Отсюда: prompt injection невозможен (подать произвольный текст некуда),
// а любое «решение» модели ни на что не влияет — она только пишет фразу.
// Модель — Haiku 4.5, ответ в одну строку: расход токенов копеечный.
// ─────────────────────────────────────────────────────────────────────────────

// Закрытый список. Ничего другого роут не принимает.
const STATUSES = {
  buy_ok: "Пользователь купил 1000 BMZH — получилось.",
  buy_fail: "Покупка 1000 BMZH не прошла.",
  x402_ok: "x402-касание прошло успешно.",
  x402_fail: "x402-касание не прошло.",
} as const;

type Status = keyof typeof STATUSES;

const SYSTEM = `Ты — ИИ-агент «Бомж» в мини-аппе на сети Base.
Тебе сообщают ИТОГ уже выполненного действия. Твоя единственная задача — озвучить его.
Ответь ОДНОЙ короткой фразой по-русски, в образе бродяги.
Если получилось — скажи, что сделано. Если нет — скажи, что не вышло.
Ничего не предлагай, ничего не спрашивай, не упоминай суммы и адреса.`;

// Запасные фразы, если модель недоступна — приложение работает и без неё.
const FALLBACK: Record<Status, string> = {
  buy_ok: "Сделано ✅",
  buy_fail: "Не получилось ❌",
  x402_ok: "Сделано ✅",
  x402_fail: "Не получилось ❌",
};

export async function POST(req: NextRequest) {
  // Защита платного ключа Anthropic: каждый вызов маршрута — платный запрос
  // к модели. Лимит намеренно щедрый — он не должен мешать НИКОМУ из живых
  // пользователей (кнопок всего две, руками столько не нажать), его задача —
  // отсечь только автоматический флуд в тысячи запросов.
  const limited = rateLimit(req, "agent", 300, 60_000);
  if (limited) return limited;

  let status: Status | null = null;
  try {
    const body = await req.json();
    if (typeof body?.status === "string" && body.status in STATUSES) {
      status = body.status as Status;
    }
  } catch {
    /* игнорируем — ниже вернём 400 */
  }

  if (!status) {
    return NextResponse.json(
      { error: "status должен быть одним из: " + Object.keys(STATUSES).join(", ") },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Без ключа приложение не ломается — отдаём заготовленную фразу.
  if (!apiKey) return NextResponse.json({ text: FALLBACK[status] });

  try {
    const res = await new Anthropic({ apiKey }).messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 60,
      system: SYSTEM,
      // tools намеренно НЕ передаются — модель не может ничего вызвать.
      messages: [{ role: "user", content: STATUSES[status] }],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join(" ")
      .trim();

    return NextResponse.json({ text: text || FALLBACK[status] });
  } catch {
    // Любая ошибка модели не должна ломать UX — действие-то уже выполнено.
    return NextResponse.json({ text: FALLBACK[status] });
  }
}
