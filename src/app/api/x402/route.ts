import { NextRequest, NextResponse } from "next/server";
import { X402_ENDPOINT } from "@/lib/constants";

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
  try {
    return await forward(req.headers.get("x-payment"));
  } catch (e) {
    // Отдаём внятную причину вместо пустого «Failed to fetch».
    return NextResponse.json(
      { error: "x402 upstream недоступен", detail: String(e).slice(0, 200) },
      { status: 502 }
    );
  }
}
