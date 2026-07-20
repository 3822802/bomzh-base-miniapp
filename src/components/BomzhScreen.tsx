"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatUnits } from "viem";
import {
  CONTRACTS,
  SALE_PRICE_ETH_PER_BMZH,
  TOKEN,
  BUILDER_DATA_SUFFIX,
} from "@/lib/constants";
import { SALE_ABI } from "@/lib/abis";

// Кнопка 1 «Bomzh»: окно ИИ-агента Бомж + прямой вызов sale-контракта «Купить».
// Покупка = прямой onchain-вызов sale (мимо сервера), с builder-атрибуцией (dataSuffix).
export function BomzhScreen() {
  const { isConnected } = useAccount();
  const sale = CONTRACTS.sale;
  const saleReady = sale !== "";

  const [eth, setEth] = useState("0.00001");

  let ethWei: bigint | undefined;
  try {
    ethWei = eth ? parseEther(eth) : undefined;
  } catch {
    ethWei = undefined;
  }

  const { data: quote } = useReadContract({
    address: saleReady ? (sale as `0x${string}`) : undefined,
    abi: SALE_ABI,
    functionName: "quote",
    args: ethWei !== undefined ? [ethWei] : undefined,
    query: { enabled: saleReady && ethWei !== undefined },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function buy() {
    if (!saleReady || ethWei === undefined) return;
    writeContract({
      address: sale as `0x${string}`,
      abi: SALE_ABI,
      functionName: "buy",
      value: ethWei,
      dataSuffix: BUILDER_DATA_SUFFIX,
    });
  }

  const busy = isPending || confirming;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <div className="mb-1 text-sm font-semibold text-yellow-300">
          ИИ-агент Бомж
        </div>
        <p className="text-sm text-white/80">
          Привет, я ИИ-агент Бомж, могу купить тебе немного бомжей для лудилки.
        </p>
      </div>

      {/* Сумма покупки */}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-white/60">Сколько ETH потратить</span>
        <input
          type="text"
          inputMode="decimal"
          value={eth}
          onChange={(e) => setEth(e.target.value.replace(",", "."))}
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono"
          placeholder="0.00001"
        />
      </label>

      <div className="text-sm text-white/70">
        Получишь ≈{" "}
        <span className="font-mono text-yellow-300">
          {quote !== undefined
            ? Number(formatUnits(quote as bigint, TOKEN.decimals)).toLocaleString(
                "ru-RU",
                { maximumFractionDigits: 4 }
              )
            : "—"}
        </span>{" "}
        {TOKEN.symbol}{" "}
        <span className="text-white/40">
          (цена ~{SALE_PRICE_ETH_PER_BMZH} ETH/{TOKEN.symbol})
        </span>
      </div>

      <button
        onClick={buy}
        disabled={!saleReady || !isConnected || ethWei === undefined || busy}
        title={
          !saleReady
            ? "Sale-контракт ещё не задеплоен (CONTRACTS.sale пуст)"
            : !isConnected
            ? "Сначала подключи кошелёк"
            : undefined
        }
        className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Покупаю…" : `Купить ${TOKEN.symbol}`}
      </button>

      {isSuccess && (
        <p className="text-sm text-green-400">Готово! {TOKEN.symbol} у тебя. 🎉</p>
      )}
      {error && (
        <p className="text-xs text-red-400">
          Ошибка: {error.message.slice(0, 140)}
        </p>
      )}
      {!saleReady && (
        <p className="text-xs text-white/40">
          Кнопка оживёт после деплоя sale-контракта (Фаза C).
        </p>
      )}
    </div>
  );
}
