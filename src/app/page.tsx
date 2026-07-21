"use client";

import { useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { AgentScreen } from "@/components/AgentScreen";
import { RouletteScreen } from "@/components/RouletteScreen";

type Tab = "home" | "agent" | "roulette";

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Фармодрочка</h1>
        <ConnectButton />
      </header>

      {tab === "home" && (
        <div className="grid flex-1 grid-rows-2 gap-4">
          <button
            onClick={() => setTab("agent")}
            className="rounded-2xl bg-gradient-to-br from-yellow-400 to-green-500 p-6 text-2xl font-black text-black shadow-lg active:scale-[0.99]"
          >
            🧔 Агент Бомж
          </button>
          <button
            onClick={() => setTab("roulette")}
            className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-2xl font-black text-white shadow-lg active:scale-[0.99]"
          >
            🎰 Рулетка
          </button>
        </div>
      )}

      {tab !== "home" && (
        <div className="flex flex-1 flex-col gap-4">
          <button
            onClick={() => setTab("home")}
            className="self-start text-sm text-white/60 hover:text-white"
          >
            ← назад
          </button>
          {tab === "agent" ? <AgentScreen /> : <RouletteScreen />}
        </div>
      )}
    </main>
  );
}
