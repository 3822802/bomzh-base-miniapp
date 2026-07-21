"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from "wagmi";
import { parseEther, publicActions } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";
import { CONTRACTS, BUILDER_DATA_SUFFIX, TOKEN, X402_ENDPOINT } from "@/lib/constants";
import { SALE_ABI } from "@/lib/abis";

type Line = { who: "bomzh" | "you"; text: string };

// Экран 1 — Агент. Две вещи: купить BMZH и сделать x402-касание.
// Агент (Haiku) решает, что вызвать; выполняет кошелёк юзера здесь, на клиенте.
export function AgentScreen() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const sale = CONTRACTS.sale;

  const [lines, setLines] = useState<Line[]>([
    { who: "bomzh", text: "Здорово. Могу купить тебе бомжей или сделать x402-касание." },
  ]);
  const [thinking, setThinking] = useState(false);
  const [x402Status, setX402Status] = useState<string | null>(null);

  function say(who: Line["who"], text: string) {
    setLines((prev) => [...prev, { who, text }]);
  }

  // x402-касание: платим $0.001 своим кошельком. Юзер видит только результат.
  async function doX402() {
    setX402Status(null);
    if (!walletClient) {
      setX402Status("Не получилось — нет кошелька");
      return;
    }
    try {
      const signer = walletClient.extend(publicActions) as unknown as Parameters<
        typeof wrapFetchWithPayment
      >[1];
      const res = await wrapFetchWithPayment(fetch, signer)(X402_ENDPOINT);
      setX402Status(res.ok ? "Сделано ✅" : "Не получилось ❌");
    } catch {
      setX402Status("Не получилось ❌");
    }
  }

  function doBuy(ethAmount: string) {
    if (!sale) {
      say("bomzh", "Sale-контракт ещё не задеплоен, купить пока нечем.");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(ethAmount || "0.00001");
    } catch {
      value = parseEther("0.00001");
    }
    writeContract({
      address: sale as `0x${string}`,
      abi: SALE_ABI,
      functionName: "buy",
      value,
      dataSuffix: BUILDER_DATA_SUFFIX, // атрибуция билдера
    });
  }

  // Отправляем фразу агенту, он решает — какой инструмент дёрнуть.
  async function ask(text: string) {
    say("you", text);
    setThinking(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        say("bomzh", `Не могу ответить: ${data.error ?? "ошибка"}`);
        return;
      }
      if (data.text) say("bomzh", data.text);

      if (data.action?.tool === "buy_token") {
        doBuy(String(data.action.input?.eth_amount ?? "0.00001"));
      } else if (data.action?.tool === "x402_touch") {
        await doX402();
      }
    } catch {
      say("bomzh", "Связь пропала, попробуй ещё раз.");
    } finally {
      setThinking(false);
    }
  }

  const busy = thinking || isPending || confirming;

  return (
    <div className="flex flex-col gap-4">
      {/* Диалог */}
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-2xl border border-white/15 bg-white/5 p-4">
        {lines.map((l, i) => (
          <div key={i} className={l.who === "you" ? "text-right" : ""}>
            <span
              className={
                l.who === "bomzh"
                  ? "text-sm text-yellow-300"
                  : "text-sm text-white/60"
              }
            >
              {l.who === "bomzh" ? "🧔 Бомж: " : "Ты: "}
            </span>
            <span className="text-sm text-white/85">{l.text}</span>
          </div>
        ))}
        {thinking && <div className="text-xs text-white/40">Бомж думает…</div>}
      </div>

      {/* Две фразы */}
      <button
        onClick={() => ask("Купи мне токен Бомж")}
        disabled={!isConnected || busy}
        className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Секунду…" : `Купить токен ${TOKEN.symbol}`}
      </button>

      <button
        onClick={() => ask("Сделай x402 касание")}
        disabled={!isConnected || busy}
        className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Секунду…" : "x402"}
      </button>

      {x402Status && (
        <p className="text-center text-sm font-semibold text-white/80">{x402Status}</p>
      )}
      {isSuccess && (
        <p className="text-center text-sm text-green-400">
          Куплено! {TOKEN.symbol} у тебя. 🎉
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400">Ошибка: {error.message.slice(0, 140)}</p>
      )}
      {!sale && (
        <p className="text-center text-xs text-white/40">
          Покупка оживёт после деплоя sale-контракта.
        </p>
      )}
    </div>
  );
}
