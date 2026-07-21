"use client";

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, BUILDER_DATA_SUFFIX, TOKEN } from "@/lib/constants";
import { ROULETTE_ABI, ERC20_ABI, NFT_ABI } from "@/lib/abis";

const TIER_NAMES = ["", "Картонка", "Ватник", "Тележка", "Золотой бомж"];

// Экран 2 — Рулетка. Крутишь за BMZH, выпадает следующий не собранный тир,
// собрал все 4 — круг начинается заново. Минт NFT происходит внутри spin().
export function RouletteScreen() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const roulette = CONTRACTS.roulette;
  const token = CONTRACTS.token;
  const nft = CONTRACTS.nft;

  const { data: nextTier } = useReadContract({
    address: roulette ? (roulette as `0x${string}`) : undefined,
    abi: ROULETTE_ABI,
    functionName: "nextTier",
    args: address ? [address] : undefined,
    query: { enabled: !!roulette && !!address },
  });

  const { data: spinCost } = useReadContract({
    address: roulette ? (roulette as `0x${string}`) : undefined,
    abi: ROULETTE_ABI,
    functionName: "spinCost",
    query: { enabled: !!roulette },
  });

  const { data: allowance } = useReadContract({
    address: token ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && roulette ? [address, roulette as `0x${string}`] : undefined,
    query: { enabled: !!token && !!roulette && !!address },
  });

  const { data: nftCount } = useReadContract({
    address: nft ? (nft as `0x${string}`) : undefined,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!nft && !!address },
  });

  const needsApprove =
    spinCost !== undefined &&
    allowance !== undefined &&
    (allowance as bigint) < (spinCost as bigint);

  const busy = isPending || confirming;

  function spinOrApprove() {
    if (!roulette || !token) return;
    if (needsApprove) {
      writeContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [roulette as `0x${string}`, (spinCost as bigint) * 100n], // запас на 100 прокрутов
        dataSuffix: BUILDER_DATA_SUFFIX,
      });
      return;
    }
    writeContract({
      address: roulette as `0x${string}`,
      abi: ROULETTE_ABI,
      functionName: "spin",
      dataSuffix: BUILDER_DATA_SUFFIX, // атрибуция билдера
    });
  }

  const tier = nextTier !== undefined ? Number(nextTier) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
        <div className="text-5xl">🎰</div>
        <div className="mt-3 text-sm text-white/60">Следующий выпадет</div>
        <div className="text-lg font-bold text-yellow-300">
          {tier > 0 ? `Тир ${tier} — ${TIER_NAMES[tier]}` : "—"}
        </div>
        {nftCount !== undefined && (
          <div className="mt-2 text-xs text-white/50">
            NFT собрано: <b className="text-white/80">{String(nftCount)}</b>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/50">
        Один прокрут —{" "}
        {spinCost !== undefined
          ? formatUnits(spinCost as bigint, TOKEN.decimals)
          : "—"}{" "}
        {TOKEN.symbol}. Тиры идут по кругу 1 → 2 → 3 → 4.
      </p>

      <button
        onClick={spinOrApprove}
        disabled={!roulette || !isConnected || busy}
        title={!roulette ? "Контракт рулетки ещё не задеплоен" : undefined}
        className="rounded-xl bg-purple-600 px-4 py-4 text-lg font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? "Кручу…"
          : needsApprove
          ? `Разрешить ${TOKEN.symbol}`
          : "Крутить 🎲"}
      </button>

      {isSuccess && !needsApprove && (
        <p className="text-center text-sm text-green-400">
          Выпало! NFT у тебя в кошельке. 🎉
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400">Ошибка: {error.message.slice(0, 140)}</p>
      )}
      {!roulette && (
        <p className="text-center text-xs text-white/40">
          Оживёт после деплоя контрактов рулетки и NFT.
        </p>
      )}
    </div>
  );
}
