"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { AgentScreen } from "@/components/AgentScreen";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Фармодрочка</h1>
        <ConnectButton />
      </header>

      <AgentScreen />
    </main>
  );
}
