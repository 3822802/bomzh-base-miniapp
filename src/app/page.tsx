"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { AgentScreen } from "@/components/AgentScreen";
import { RouletteScreen } from "@/components/RouletteScreen";

type Tab = "home" | "farm" | "airdrop";

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");

  // Окно апки: занимает ровно высоту экрана (dvh — с поправкой на панели
  // мобильных браузеров) и не шире телефона даже на десктопе.
  const shell = "mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col";

  if (tab === "farm") {
    return (
      <div className={shell}>
        <AgentScreen onBack={() => setTab("home")} />
      </div>
    );
  }

  if (tab === "airdrop") {
    return (
      <div className={shell}>
        <RouletteScreen onBack={() => setTab("home")} />
      </div>
    );
  }

  return (
    <div className={`${shell} bg-white`}>
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        <Header dark />

        <button
          onClick={() => setTab("farm")}
          className="nes-card relative min-h-[130px] w-full flex-1 overflow-hidden"
        >
          <span
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/img/bg-farm.png)" }}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="nes-title text-[clamp(22px,8vw,30px)]">ФАРМ</span>
          </span>
        </button>

        <button
          onClick={() => setTab("airdrop")}
          className="nes-card relative min-h-[130px] w-full flex-1 overflow-hidden"
        >
          <span
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/img/bg-airdrop.png)" }}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="nes-title text-[clamp(18px,6.5vw,26px)]">
              АИРДРОП
            </span>
          </span>
        </button>
      </main>
    </div>
  );
}
