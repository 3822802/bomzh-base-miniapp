"use client";

import { SPIN_PRICE_USDC } from "@/lib/constants";

// Кнопка 2 «Лудить»: рулетка (спин) + x402-гейт $0.02 USDC на /api/spin,
// 4 тира выигрыша, минт выпавшего NFT.
// Пока каркас: контракты рулетки/NFT и x402 — Фаза C (шаг 8).
export function LudkaScreen() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/5 p-6 text-center">
        <div className="text-4xl">🎰</div>
        <div className="mt-2 text-sm text-white/70">Рулетка · 4 тира</div>
      </div>

      <button
        disabled
        title="Подключается в Фазе C (рулетка + x402 + NFT)"
        className="rounded-xl bg-purple-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Крутить · x402 ${SPIN_PRICE_USDC} USDC
      </button>

      <p className="text-xs text-white/40">
        Каркас. Контракт рулетки, x402-гейт и NFT — Фаза C.
      </p>
    </div>
  );
}
