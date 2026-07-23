import { NextRequest, NextResponse } from "next/server";
import {
  MCP_CLIENT_ID,
  MCP_TOKEN,
  redirectUri,
  saveToken,
  takeVerifier,
} from "@/lib/mcp";

export const runtime = "nodejs";

// Шаг 2 OAuth: Base возвращает code → меняем его на токен и сохраняем.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");

  if (err) return page(`Base отказал: ${err}`, false);
  if (!code || !state) return page("Нет code или state в ответе", false);

  const verifier = takeVerifier(state);
  if (!verifier) return page("Неизвестный state (istёк или перезапуск сервера)", false);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: MCP_CLIENT_ID,
    redirect_uri: redirectUri(req.nextUrl.origin),
    code_verifier: verifier,
  });

  const res = await fetch(MCP_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) return page(`Обмен кода не удался (${res.status}): ${text.slice(0, 200)}`, false);

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    return page("Ответ токен-эндпоинта — не JSON", false);
  }

  saveToken({
    access_token: String(json.access_token ?? ""),
    refresh_token: json.refresh_token ? String(json.refresh_token) : undefined,
    expires_at:
      typeof json.expires_in === "number"
        ? Date.now() + json.expires_in * 1000
        : undefined,
    scope: json.scope ? String(json.scope) : undefined,
  });

  return page("Base MCP подключён. Можно закрывать вкладку.", true);
}

// Экранируем всё, что попадает в HTML: часть сообщений содержит значения
// из query (?error=…), иначе — отражённый XSS на нашем origin.
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function page(msg: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;background:#111;color:#eee;padding:40px">
     <h2>${ok ? "✅" : "❌"} ${esc(msg)}</h2></body>`,
    {
      status: ok ? 200 : 400,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    }
  );
}
