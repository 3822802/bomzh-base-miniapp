"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { publicActions } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";
import { Header } from "./Header";
import {
  CONTRACTS,
  BUILDER_DATA_SUFFIX,
  X402_ENDPOINT,
  BUY_PAYMENT_WEI,
  GAS,
} from "@/lib/constants";
import { SALE_ABI } from "@/lib/abis";

type Status = "buy_ok" | "buy_fail" | "x402_ok" | "x402_fail";

// Экран ФАРМ. Ровно два действия, поля ввода нет.
// Действия выполняются кодом детерминированно; ИИ-агент только озвучивает итог
// (у модели нет инструментов и она не получает пользовательский текст).
export function AgentScreen({ onBack }: { onBack: () => void }) {
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
        ? "Сделано!"
        : "Не получилось.";
    } catch {
      return status.endsWith("_ok") ? "Сделано!" : "Не получилось.";
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

  async function run(action: () => Promise<boolean>, ok: Status, fail: Status) {
    setBusy(true);
    setReply(null);
    const done = await action();
    setReply(await phrase(done ? ok : fail));
    setBusy(false);
  }

  const locked = !isConnected || busy;

  return (
    <div className="flex h-full flex-col bg-[#7b7bef]">
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <Header />

        {/* Реплика агента */}
        <div className="nes-box shrink-0 text-[8px]">
          {busy
            ? "Секунду, работаю…"
            : reply ??
              "Привет! я искусственный интеллект который поможет тебе разбогатеть"}
        </div>

        {/* Картинка агента */}
        <div
          className="nes-frame mx-auto w-full max-w-[290px] min-h-[110px] flex-1 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/agent.png)" }}
        />

        {/* Меню. Ровно три пункта — ничего другого агент делать не умеет. */}
        <div className="nes-box shrink-0 text-[8px]">
          <button
            onClick={() => run(buy, "buy_ok", "buy_fail")}
            disabled={locked || !sale}
            className="nes-menu-item"
          >
            <span className="nes-caret">▶</span> КУПИТЬ BMZH- B20
          </button>
          <button
            onClick={() => run(x402, "x402_ok", "x402_fail")}
            disabled={locked}
            className="nes-menu-item"
          >
            <span className="nes-caret">▶</span> КОСНУТЬСЯ X402
          </button>
          <button onClick={onBack} disabled={busy} className="nes-menu-item">
            <span className="nes-caret">▶</span> НАЗАД
          </button>
        </div>

        {!isConnected && (
          <p className="shrink-0 text-center text-[7px] leading-4 text-white [text-shadow:2px_2px_0_#000]">
            СНАЧАЛА ПОДКЛЮЧИ КОШЕЛЁК
          </p>
        )}
      </main>
    </div>
  );
}
