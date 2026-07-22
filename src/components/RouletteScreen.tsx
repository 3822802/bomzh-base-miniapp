"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { base } from "wagmi/chains";
import { formatUnits, parseEventLogs } from "viem";
import { Header } from "./Header";
import { Wheel, LAYOUT, STEP } from "./Wheel";
import { Celebration } from "./Celebration";
import { useEnsureBase } from "@/lib/useBaseChain";
import { CONTRACTS, BUILDER_DATA_SUFFIX, TOKEN, GAS } from "@/lib/constants";
import { ROULETTE_ABI, ERC20_ABI } from "@/lib/abis";

const SPIN_MS = 4200; // должно совпадать с длительностью transition в Wheel

function reason(e: unknown): string {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (m.includes("user rejected") || m.includes("denied")) return "ОТМЕНА В КОШЕЛЬКЕ";
  if (m.includes("insufficient funds")) return "НЕ ХВАТАЕТ ETH НА ГАЗ";
  if (m.includes("chain") && m.includes("match")) return "КОШЕЛЁК НЕ В СЕТИ BASE";
  return "НЕ ПОЛУЧИЛОСЬ";
}

// Экран АИРДРОП. Кнопка ВСЕГДА называется CLAIM: если разрешения на токен ещё
// нет, approve уходит первым шагом внутри того же нажатия — пользователю
// не нужно знать про allowance, он просто подписывает две транзакции подряд.
export function RouletteScreen({ onBack }: { onBack: () => void }) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const ensureBase = useEnsureBase();

  const roulette = CONTRACTS.roulette;
  const token = CONTRACTS.token;

  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [won, setWon] = useState<number | null>(null);

  const { data: nextPrize, refetch: refetchPrize } = useReadContract({
    address: roulette ? (roulette as `0x${string}`) : undefined,
    abi: ROULETTE_ABI,
    functionName: "nextPrize",
    args: address ? [address] : undefined,
    query: { enabled: !!roulette && !!address },
  });

  const { data: spinCost } = useReadContract({
    address: roulette ? (roulette as `0x${string}`) : undefined,
    abi: ROULETTE_ABI,
    functionName: "spinCost",
    query: { enabled: !!roulette },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && roulette ? [address, roulette as `0x${string}`] : undefined,
    query: { enabled: !!token && !!roulette && !!address },
  });

  async function claim() {
    if (!roulette || !token || !publicClient || busy) return;
    setBusy(true);
    setStep(null);
    setWon(null);

    // Запасное значение на случай, если событие не удалось разобрать.
    const ожидаемый = nextPrize !== undefined ? Number(nextPrize) : 1;

    try {
      await ensureBase();

      // Шаг 1 — разрешение, если его не хватает. Пользователю не показываем
      // отдельной кнопкой, просто просим вторую подпись.
      const cost = (spinCost as bigint | undefined) ?? 0n;
      if (allowance !== undefined && (allowance as bigint) < cost) {
        setStep("ШАГ 1 ИЗ 2: РАЗРЕШЕНИЕ…");
        const aHash = await writeContractAsync({
          address: token as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          chainId: base.id,
          args: [roulette as `0x${string}`, cost * 100n], // запас на 100 прокрутов
          gas: GAS.approve, // BMZH — прекомпайл, кошельки занижают лимит
          dataSuffix: BUILDER_DATA_SUFFIX,
        });
        await publicClient.waitForTransactionReceipt({ hash: aHash });
        await refetchAllowance();
        setStep("ШАГ 2 ИЗ 2: ПОДПИШИ ПРОКРУТ…");
      } else {
        setStep("ПОДПИШИ В КОШЕЛЬКЕ…");
      }

      // Шаг 2 — сам прокрут. NFT минтится внутри этой же транзакции.
      const hash = await writeContractAsync({
        address: roulette as `0x${string}`,
        abi: ROULETTE_ABI,
        functionName: "spin",
        chainId: base.id,
        gas: GAS.spin, // transferFrom + минт NFT
        dataSuffix: BUILDER_DATA_SUFFIX, // атрибуция билдера
      });

      setStep("ЖДЁМ СЕТЬ…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("reverted");

      // ПРИЗ БЕРЁМ ИЗ СОБЫТИЯ, а не из nextPrize.
      // nextPrize читался заранее и кэшируется wagmi: если узел отставал
      // на блок, кэш возвращал прошлое значение и колесо останавливалось
      // не на том призе, который реально сминтился. Событие Spun — это факт.
      const spun = parseEventLogs({
        abi: ROULETTE_ABI,
        eventName: "Spun",
        logs: receipt.logs,
      })[0];
      const prize = spun ? Number(spun.args.prize) : ожидаемый;

      // Крутим на выпавший сектор. TIER 1 занимает пять слотов — берём любой.
      const seats = LAYOUT.map((p, i) => (p === prize ? i : -1)).filter((i) => i >= 0);
      const seat = seats[Math.floor(Math.random() * seats.length)];

      setStep("КРУТИТСЯ…");
      setSpinning(true);
      setRot((r) => r + 360 * 6 - seat * STEP - (r % 360));

      await new Promise((r) => setTimeout(r, SPIN_MS));
      setSpinning(false);
      setStep(null);
      setWon(prize); // ← показываем хлопушку
      refetchPrize();
      refetchAllowance();
    } catch (e) {
      setSpinning(false);
      setStep(reason(e));
    } finally {
      setBusy(false);
    }
  }

  const status =
    step ??
    (!isConnected
      ? "ПОДКЛЮЧИ КОШЕЛЁК"
      : spinCost !== undefined
      ? `ПРОКРУТ — ${formatUnits(spinCost as bigint, TOKEN.decimals)} ${TOKEN.symbol}`
      : " ");

  return (
    <div className="nes-sky flex h-full flex-col">
      {/* Облака в процентах от высоты окна — чтобы держались на любом экране
          и не прятались за шапкой. */}
      <span className="nes-cloud" style={{ top: "14%", left: "6%" }} />
      <span className="nes-cloud" style={{ top: "20%", right: "8%" }} />
      <span className="nes-cloud" style={{ top: "62%", left: "3%" }} />
      <span className="nes-cloud" style={{ top: "70%", right: "4%" }} />

      <div className="shrink-0 px-4 pt-4">
        <Header />
      </div>

      <h2 className="nes-title relative z-10 mt-3 shrink-0 text-center text-[clamp(18px,6.5vw,26px)]">
        AIRDROP
      </h2>

      {/* Колесо в оптическом центре окна */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="relative">
          <svg
            viewBox="0 0 40 40"
            className="absolute left-1/2 top-[-10px] z-10 w-8 -translate-x-1/2"
          >
            <polygon points="20,36 6,4 34,4" fill="#e03b30" stroke="#000" strokeWidth="3" />
          </svg>
          <Wheel rot={rot} spinning={spinning} />
        </div>
      </div>

      <div className="relative z-10 mb-2 shrink-0 px-3 text-center text-[8px] leading-4 text-white [text-shadow:2px_2px_0_#000]">
        {status}
      </div>

      <div className="relative z-10 mb-3 flex shrink-0 justify-center gap-3 px-4">
        <button
          onClick={claim}
          disabled={!roulette || !isConnected || busy}
          className="nes-btn nes-btn-green flex-1 text-center text-[10px] disabled:opacity-60"
        >
          CLAIM
        </button>
        <button
          onClick={onBack}
          disabled={busy}
          className="nes-btn nes-btn-orange flex-1 text-center text-[10px] disabled:opacity-60"
        >
          НАЗАД
        </button>
      </div>

      <div className="nes-brick" />

      {won !== null && (
        <Celebration prize={won} onClose={() => setWon(null)} />
      )}
    </div>
  );
}
