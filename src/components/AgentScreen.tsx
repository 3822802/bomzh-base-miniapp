"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from "wagmi";
import { parseEther, formatUnits, publicActions } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";
import {
  CONTRACTS,
  TOKEN,
  BUILDER_DATA_SUFFIX,
  SALE_PRICE_ETH_PER_BMZH,
  X402_ENDPOINT,
} from "@/lib/constants";
import { SALE_ABI, ERC20_ABI, CARE_ABI } from "@/lib/abis";

// Единственный экран: агент Бомж и три действия.
// Каждое ончейн-действие несёт builder-суффикс (атрибуция).
export function AgentScreen() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const sale = CONTRACTS.sale;
  const care = CONTRACTS.care;
  const token = CONTRACTS.token;

  const [eth, setEth] = useState("0.00001");
  const [x402Busy, setX402Busy] = useState(false);
  const [x402Result, setX402Result] = useState<string | null>(null);
  const [x402Error, setX402Error] = useState<string | null>(null);

  let ethWei: bigint | undefined;
  try {
    ethWei = eth ? parseEther(eth) : undefined;
  } catch {
    ethWei = undefined;
  }

  // ── чтение состояния ухода ──
  const { data: careState } = useReadContract({
    address: care ? (care as `0x${string}`) : undefined,
    abi: CARE_ABI,
    functionName: "stateOf",
    args: address ? [address] : undefined,
    query: { enabled: !!care && !!address },
  });

  const { data: canFeed } = useReadContract({
    address: care ? (care as `0x${string}`) : undefined,
    abi: CARE_ABI,
    functionName: "canFeed",
    args: address ? [address] : undefined,
    query: { enabled: !!care && !!address },
  });

  const { data: feedCost } = useReadContract({
    address: care ? (care as `0x${string}`) : undefined,
    abi: CARE_ABI,
    functionName: "feedCost",
    query: { enabled: !!care },
  });

  const { data: allowance } = useReadContract({
    address: token ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && care ? [address, care as `0x${string}`] : undefined,
    query: { enabled: !!token && !!care && !!address },
  });

  const { data: quote } = useReadContract({
    address: sale ? (sale as `0x${string}`) : undefined,
    abi: SALE_ABI,
    functionName: "quote",
    args: ethWei !== undefined ? [ethWei] : undefined,
    query: { enabled: !!sale && ethWei !== undefined },
  });

  const streak = careState ? Number(careState[1]) : 0;
  const totalFeeds = careState ? Number(careState[2]) : 0;
  const needsApprove =
    feedCost !== undefined &&
    allowance !== undefined &&
    (allowance as bigint) < (feedCost as bigint);

  const busy = isPending || confirming;

  // ── действия ──
  function buy() {
    if (!sale || ethWei === undefined) return;
    writeContract({
      address: sale as `0x${string}`,
      abi: SALE_ABI,
      functionName: "buy",
      value: ethWei,
      dataSuffix: BUILDER_DATA_SUFFIX,
    });
  }

  function approveThenFeed() {
    if (!care || !token) return;
    if (needsApprove) {
      writeContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [care as `0x${string}`, (feedCost as bigint) * 100n], // запас на 100 кормлений
        dataSuffix: BUILDER_DATA_SUFFIX,
      });
      return;
    }
    writeContract({
      address: care as `0x${string}`,
      abi: CARE_ABI,
      functionName: "feed",
      dataSuffix: BUILDER_DATA_SUFFIX,
    });
  }

  // x402: агент как ПОКУПАТЕЛЬ — платит $0.001 USDC, ключи не нужны.
  async function askBomzh() {
    if (!walletClient) return;
    setX402Busy(true);
    setX402Error(null);
    setX402Result(null);
    try {
      // x402-fetch ждёт wallet client, расширенный публичными действиями.
      // Приведение типа: у Base (OP Stack) свой тип транзакции `deposit`, который
      // структурно не сходится с обобщённым Chain в типах x402-fetch.
      // На рантайме объект корректный — это именно тот viem-клиент, что нужен.
      const signer = walletClient.extend(publicActions) as unknown as Parameters<
        typeof wrapFetchWithPayment
      >[1];
      const fetchWithPay = wrapFetchWithPayment(fetch, signer);
      const res = await fetchWithPay(X402_ENDPOINT);
      const data = await res.json();
      setX402Result(JSON.stringify(data).slice(0, 400));
    } catch (e) {
      setX402Error(e instanceof Error ? e.message.slice(0, 160) : "ошибка");
    } finally {
      setX402Busy(false);
    }
  }

  const line = !isConnected
    ? "Подключи кошелёк, мил человек."
    : totalFeeds === 0
    ? "Привет, я Бомж. Покорми меня — и я тебя не забуду."
    : `Кормил меня ${totalFeeds} раз. Стрик: ${streak} дн.`;

  return (
    <div className="flex flex-col gap-5">
      {/* Агент */}
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="mb-1 text-sm font-semibold text-yellow-300">
          🧔 ИИ-агент Бомж
        </div>
        <p className="text-sm text-white/80">{line}</p>
        {totalFeeds > 0 && (
          <div className="mt-3 flex gap-4 text-xs text-white/50">
            <span>Стрик: <b className="text-white/80">{streak}</b>/5</span>
            <span>Всего: <b className="text-white/80">{totalFeeds}</b></span>
          </div>
        )}
      </div>

      {/* 1. Покормить */}
      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-2 text-sm font-semibold">Покормить бомжа</div>
        <p className="mb-3 text-xs text-white/50">
          Раз в сутки. Стоит{" "}
          {feedCost !== undefined
            ? formatUnits(feedCost as bigint, TOKEN.decimals)
            : "—"}{" "}
          {TOKEN.symbol}. Бейджи: за 1-й день и за 5 дней подряд.
        </p>
        <button
          onClick={approveThenFeed}
          disabled={!care || !isConnected || busy || (!needsApprove && canFeed === false)}
          title={!care ? "Контракт BomzhCare ещё не задеплоен" : undefined}
          className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Отправляю…"
            : needsApprove
            ? `Разрешить ${TOKEN.symbol}`
            : canFeed === false
            ? "Уже кормил сегодня"
            : "Покормить 🍲"}
        </button>
      </section>

      {/* 2. Купить BMZH */}
      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-2 text-sm font-semibold">Купить {TOKEN.symbol}</div>
        <input
          type="text"
          inputMode="decimal"
          value={eth}
          onChange={(e) => setEth(e.target.value.replace(",", "."))}
          className="mb-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm"
          placeholder="0.00001"
        />
        <p className="mb-3 text-xs text-white/50">
          Получишь ≈{" "}
          <span className="font-mono text-yellow-300">
            {quote !== undefined
              ? Number(
                  formatUnits(quote as bigint, TOKEN.decimals)
                ).toLocaleString("ru-RU", { maximumFractionDigits: 4 })
              : "—"}
          </span>{" "}
          {TOKEN.symbol} · цена ~{SALE_PRICE_ETH_PER_BMZH} ETH
        </p>
        <button
          onClick={buy}
          disabled={!sale || !isConnected || ethWei === undefined || busy}
          title={!sale ? "Sale-контракт ещё не задеплоен" : undefined}
          className="w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Покупаю…" : `Купить ${TOKEN.symbol}`}
        </button>
      </section>

      {/* 3. Спросить (x402) */}
      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-2 text-sm font-semibold">Спросить у бомжа про курс</div>
        <p className="mb-3 text-xs text-white/50">
          Агент платит <b>$0.001 USDC</b> по x402 и приносит цены. Нужен USDC на Base.
        </p>
        <button
          onClick={askBomzh}
          disabled={!isConnected || x402Busy || !walletClient}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {x402Busy ? "Плачу и спрашиваю…" : "Спросить (x402)"}
        </button>
        {x402Result && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-green-300">
            {x402Result}
          </pre>
        )}
        {x402Error && (
          <p className="mt-2 text-xs text-red-400">Ошибка: {x402Error}</p>
        )}
      </section>

      {error && (
        <p className="text-xs text-red-400">
          Ошибка: {error.message.slice(0, 160)}
        </p>
      )}
    </div>
  );
}
