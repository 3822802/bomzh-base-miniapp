import { NextRequest, NextResponse } from "next/server";
import { X402_ENDPOINT } from "@/lib/constants";
import { rateLimit } from "@/lib/ratelimit";

// Прозрачный прокси к x402-эндпоинту.
//
// Зачем: браузер ходил на чужой домен напрямую и падал с «Failed to fetch».
// CORS у сервиса настроен верно (проверено: preflight разрешает X-Payment),
// значит запрос рвётся уже на сетевом уровне — блокировщики, расширения,
// корпоративный DNS. Через свой домен этот класс проблем исчезает целиком:
// запрос становится same-origin, а наружу ходит сервер.
//
// Схему оплаты это не ломает: подпись x402 (EIP-3009) считается по полям
// payTo/asset/value из ответа сервера, адрес ресурса в неё не входит.
// Мы просто передаём 402 клиенту и отправляем обратно готовый X-PAYMENT.

export const dynamic = "force-dynamic";

async function forward(payment: string | null) {
  const upstream = await fetch(X402_ENDPOINT, {
    headers: payment ? { "x-payment": payment } : undefined,
    cache: "no-store",
  });

  const body = await upstream.text();
  const res = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });

  // Квитанция о платеже — клиентской библиотеке она нужна.
  const receipt = upstream.headers.get("x-payment-response");
  if (receipt) res.headers.set("x-payment-response", receipt);

  return res;
}

export async function GET(req: NextRequest) {
  // Не даём гонять свой сервер как безымянный релей к апстриму.
  const limited = rateLimit(req, "x402", 30, 60_000);
  if (limited) return limited;

  try {
    return await forward(req.headers.get("x-payment"));
  } catch (e) {
    // Наружу — общая причина; подробности пишем только в лог сервера.
    console.error("x402 upstream error:", e);
    return NextResponse.json(
      { error: "x402 upstream недоступен" },
      { status: 502 }
    );
  }
}
