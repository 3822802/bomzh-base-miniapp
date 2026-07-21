import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  MCP_AUTHORIZE,
  MCP_CLIENT_ID,
  MCP_SCOPE,
  challengeOf,
  makeVerifier,
  redirectUri,
  rememberState,
} from "@/lib/mcp";

export const runtime = "nodejs";

// Шаг 1 OAuth: генерим PKCE и отправляем пользователя на экран согласия Base.
export async function GET(req: NextRequest) {
  const verifier = makeVerifier();
  const state = crypto.randomBytes(16).toString("base64url");
  rememberState(state, verifier);

  const url = new URL(MCP_AUTHORIZE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", MCP_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri(req.nextUrl.origin));
  url.searchParams.set("scope", MCP_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challengeOf(verifier));
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url.toString());
}
