import { NextResponse } from "next/server";
import { MCP_URL, loadToken } from "@/lib/mcp";

export const runtime = "nodejs";

// Диагностика: что Base MCP реально умеет. Требует пройденной авторизации.
async function rpc(token: string, method: string, params?: unknown, id = 1) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await res.text();
  // Streamable HTTP может отдать SSE — вытащим JSON из строки data:
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  const payload = line ? line.slice(5).trim() : text;
  try {
    return { status: res.status, json: JSON.parse(payload) };
  } catch {
    return { status: res.status, raw: text.slice(0, 500) };
  }
}

export async function GET() {
  const t = loadToken();
  if (!t?.access_token) {
    return NextResponse.json(
      { error: "нет токена — сначала пройди /api/mcp/start" },
      { status: 401 }
    );
  }

  const init = await rpc(t.access_token, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "bomzh-miniapp", version: "1.0.0" },
  });

  const tools = await rpc(t.access_token, "tools/list", undefined, 2);

  return NextResponse.json({ initialize: init, tools });
}
