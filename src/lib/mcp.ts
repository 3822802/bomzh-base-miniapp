import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Подключение к Base MCP (mcp.base.org) — OAuth 2.0 + PKCE.
// client_id получен динамической регистрацией; секрета нет (публичный клиент),
// поэтому его не нужно прятать.
//
// ⚠️ Хранение токена: для разработки — файл .mcp-token.json (в .gitignore).
// На Vercel файловая система эфемерна — перед продом заменить на нормальное
// хранилище (KV/БД), с привязкой токена к пользователю.
// ─────────────────────────────────────────────────────────────────────────────

export const MCP_URL = "https://mcp.base.org";
export const MCP_CLIENT_ID = "7c49b24b-4508-4f1e-bea1-dba86f96af4d";
export const MCP_SCOPE = "agent_wallet:transact";

export const MCP_AUTHORIZE = `${MCP_URL}/authorize`;
export const MCP_TOKEN = `${MCP_URL}/token`;

const TOKEN_FILE = path.join(process.cwd(), ".mcp-token.json");

export type McpToken = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
};

// ── PKCE ──
export function makeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function challengeOf(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ── Временное состояние авторизации (живёт в памяти процесса) ──
const pending = new Map<string, string>(); // state -> verifier

export function rememberState(state: string, verifier: string) {
  pending.set(state, verifier);
}

export function takeVerifier(state: string): string | undefined {
  const v = pending.get(state);
  pending.delete(state);
  return v;
}

// ── Токен на диске ──
export function saveToken(t: McpToken) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2), "utf8");
}

export function loadToken(): McpToken | null {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")) as McpToken;
  } catch {
    return null;
  }
}

export function redirectUri(origin: string): string {
  return `${origin}/api/mcp/callback`;
}
