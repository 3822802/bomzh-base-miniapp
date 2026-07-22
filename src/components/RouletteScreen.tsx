"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { Header } from "./Header";
import { Wheel, PRIZES, LAYOUT, STEP } from "./Wheel";
import { CONTRACTS, BUILDER_DATA_SUFFIX, TOKEN, GAS } from "@/lib/constants";
import { ROULETTE_ABI, ERC20_ABI } from "@/lib/abis";

const SPIN_MS = 4200; // должно совпадать с длительностью transition в Wheel

// Экран АИРДРОП. Одна кнопка CLAIM делает всё: подпись → транзакция spin() →
// NFT минтится внутри неё же → колесо докручивается до выпавшего приза.
// Приз известен заранее (контракт выдаёт их по кругу), поэтому анимация
// всегда совпадает с тем, что реально пришло в кошелёк.
export function RouletteScreen({ onBack }: { onBack: () => void }) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const roulette = CONTRACTS.roulette;
  const token = CONTRACTS.token;

  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  // Приз, зафиксированный в момент нажатия: после успеха контракт уже
  // покажет следующий, а крутить надо на тот, что выпал.
  const armed = useRef<number | null>(null);
  const handled = useRef<string | null>(null);

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

  const needsApprove =
    spinCost !== undefined &&
    allowance !== undefined &&
    (allowance as bigint) < (spinCost as bigint);

  // Транзакция подтвердилась: если это был спин — доводим колесо до приза.
  useEffect(() => {
    if (!isSuccess || !hash || handled.current === hash) return;
    handled.current = hash;

    refetchAllowance();
    refetchPrize();

    const prize = armed.current;
    armed.current = null;
    if (!prize) return; // это был approve — крутить нечего

    // Сектор с этим призом: TIER 1 занимает пять слотов, берём любой.
    const seats = LAYOUT.map((p, i) => (p === prize ? i : -1)).filter((i) => i >= 0);
    const seat = seats[Math.floor(Math.random() * seats.length)];

    setSpinning(true);
    setRot((r) => r + 360 * 6 - (seat * STEP) - (r % 360));

    const t = setTimeout(() => {
      setSpinning(false);
      setWon(prize);
      reset(); // чтобы следующий клик снова прошёл весь цикл
    }, SPIN_MS);
    return () => clearTimeout(t);
  }, [isSuccess, hash, refetchAllowance, refetchPrize, reset]);

  const busy = isPending || confirming || spinning;

  function claim() {
    if (!roulette || !token || busy) return;
    setWon(null);

    if (needsApprove) {
      armed.current = null;
      writeContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [roulette as `0x${string}`, (spinCost as bigint) * 100n], // запас на 100 прокрутов
        gas: GAS.approve, // явный лимит: BMZH — прекомпайл, кошельки его занижают
        dataSuffix: BUILDER_DATA_SUFFIX,
      });
      return;
    }

    armed.current = nextPrize !== undefined ? Number(nextPrize) : 1;
    writeContract({
      address: roulette as `0x${string}`,
      abi: ROULETTE_ABI,
      functionName: "spin",
      gas: GAS.spin, // transferFrom по прекомпайлу + минт NFT
      dataSuffix: BUILDER_DATA_SUFFIX, // атрибуция билдера
    });
  }

  const status = !isConnected
    ? "ПОДКЛЮЧИ КОШЕЛЁК"
    : isPending
    ? "ПОДПИШИ В КОШЕЛЬКЕ…"
    : confirming
    ? "ЖДЁМ СЕТЬ…"
    : spinning
    ? "КРУТИТСЯ…"
    : won
    ? `ВЫПАЛО: ${PRIZES[won - 1].name}`
    : error
    ? "НЕ ПОЛУЧИЛОСЬ"
    : spinCost !== undefined
    ? `ПРОКРУТ — ${formatUnits(spinCost as bigint, TOKEN.decimals)} ${TOKEN.symbol}`
    : " ";

  return (
    <div className="nes-sky flex h-full flex-col">
      <span className="nes-cloud" style={{ top: 44, left: 12 }} />
      <span className="nes-cloud" style={{ top: 28, right: 16 }} />

      <div className="shrink-0 px-4 pt-4">
        <Header />
      </div>

      <h2 className="nes-title relative z-10 mt-3 shrink-0 text-center text-[clamp(18px,6.5vw,26px)]">
        AIRDROP
      </h2>

      {/* Колесо в оптическом центре окна */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="relative">
          {/* указатель */}
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
          {needsApprove ? "РАЗРЕШИТЬ" : "CLAIM"}
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
    </div>
  );
}
