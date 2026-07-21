"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { publicActions } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";
import {
  CONTRACTS,
  BUILDER_DATA_SUFFIX,
  TOKEN,
  X402_ENDPOINT,
  BUY_PAYMENT_WEI,
  GAS,
} from "@/lib/constants";
import { SALE_ABI } from "@/lib/abis";

type Status = "buy_ok" | "buy_fail" | "x402_ok" | "x402_fail";

// Экран агента. Ровно две кнопки, поля ввода нет.
// Действия выполняются кодом детерминированно; ИИ-агент только озвучивает итог
// (у модели нет инструментов и она не получает пользовательский текст).
export function AgentScreen() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const sale = CONTRACTS.sale;
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);

  // Спрашиваем у агента фразу по закрытому статусу.
  async function phrase(status: Status): Promise<string> {
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      return typeof data.text === "string" && data.text
        ? data.text
        : status.endsWith("_ok")
        ? "Сделано ✅"
        : "Не получилось ❌";
    } catch {
      return status.endsWith("_ok") ? "Сделано ✅" : "Не получилось ❌";
    }
  }

  // Покупка: сумма ЖЁСТКО задана приложением (1000 BMZH).
  async function buy(): Promise<boolean> {
    if (!sale || !publicClient) return false;
    try {
      const hash = await writeContractAsync({
        address: sale as `0x${string}`,
        abi: SALE_ABI,
        functionName: "buy",
        value: BUY_PAYMENT_WEI,
        gas: GAS.buy, // явный лимит: BMZH — прекомпайл, кошельки его занижают
        dataSuffix: BUILDER_DATA_SUFFIX, // атрибуция билдера
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return receipt.status === "success";
    } catch {
      return false;
    }
  }

  // x402-касание: платим $0.001 USDC кошельком пользователя.
  async function x402(): Promise<boolean> {
    if (!walletClient) return false;
    try {
      const signer = walletClient.extend(publicActions) as unknown as Parameters<
        typeof wrapFetchWithPayment
      >[1];
      const res = await wrapFetchWithPayment(fetch, signer)(X402_ENDPOINT);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function run(action: () => Promise<boolean>, okStatus: Status, failStatus: Status) {
    setBusy(true);
    setReply(null);
    const ok = await action();
    setReply(await phrase(ok ? okStatus : failStatus));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
        <div className="text-3xl">🧔</div>
        <div className="mt-1 text-sm font-semibold text-yellow-300">ИИ-агент Бомж</div>
        <p className="mt-1 text-xs text-white/50">Умеет ровно две вещи.</p>
      </div>

      <button
        onClick={() => run(buy, "buy_ok", "buy_fail")}
        disabled={!sale || !isConnected || busy}
        title={!sale ? "Sale-контракт ещё не задеплоен" : undefined}
        className="rounded-xl bg-green-600 px-4 py-4 font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Секунду…" : `Купить 1000 ${TOKEN.symbol}`}
      </button>

      <button
        onClick={() => run(x402, "x402_ok", "x402_fail")}
        disabled={!isConnected || busy}
        className="rounded-xl bg-blue-600 px-4 py-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Секунду…" : "x402"}
      </button>

      {reply && (
        <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-center">
          <span className="text-sm text-yellow-300">🧔 </span>
          <span className="text-sm text-white/85">{reply}</span>
        </div>
      )}

      {!sale && (
        <p className="text-center text-xs text-white/40">
          Покупка оживёт после деплоя sale-контракта.
        </p>
      )}
    </div>
  );
}
