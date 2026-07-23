import { NextRequest, NextResponse } from "next/server";

// Простой ограничитель частоты по IP, без внешних зависимостей.
//
// Оговорка честно: счётчик живёт в памяти процесса. На Vercel инстансов
// несколько и они холодно стартуют, поэтому лимит НЕ глобально точный —
// злоумышленник, попавший на разные инстансы, получит немного больше окон.
// Но он превращает «дёргай бесконечно» в «дёргай десятками», а это и есть
// цель: сбить автоматический флуд и защитить платный ключ Anthropic.
// Для строгого глобального лимита нужен общий стор (Vercel KV / Upstash) —
// это отдельный шаг перед серьёзной нагрузкой.

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// Чтобы Map не рос вечно — изредка чистим протухшие записи.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

function clientIp(req: NextRequest): string {
  // Vercel/прокси кладут реальный IP в x-forwarded-for (первый в списке).
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Возвращает NextResponse 429, если лимит превышен, иначе null.
 * @param limit  сколько запросов разрешено в окне
 * @param windowMs размер окна в миллисекундах
 */
export function rateLimit(
  req: NextRequest,
  bucketName: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  sweep(now);

  const key = `${bucketName}:${clientIp(req)}`;
  const b = store.get(key);

  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (b.count >= limit) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Слишком часто. Подожди немного." },
      { status: 429, headers: { "retry-after": String(retry) } }
    );
  }

  b.count += 1;
  return null;
}
