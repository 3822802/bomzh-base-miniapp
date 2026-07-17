"use client";

import { SALE_PRICE_ETH_PER_BMZH, TOKEN } from "@/lib/constants";

// Кнопка 1 «Bomzh»: окно ИИ-агента Бомж (AgentKit) + автоответ «Купить».
// Пока каркас: агент и sale-контракт подключаются в Фазе C (шаги 7, 9).
export function BomzhScreen() {
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

      <button
        disabled
        title="Подключается в Фазе C (sale-контракт + AgentKit)"
        className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Купить {TOKEN.symbol} · ~{SALE_PRICE_ETH_PER_BMZH} ETH
      </button>

      <p className="text-xs text-white/40">
        Каркас. Sale-контракт и агент — Фаза C.
      </p>
    </div>
  );
}
