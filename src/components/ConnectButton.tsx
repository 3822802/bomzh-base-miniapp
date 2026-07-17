"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-mono hover:bg-white/10"
      >
        {short(address)}
      </button>
    );
  }

  const cb = connectors.find((c) => c.id === "coinbaseWalletSDK") ?? connectors[0];

  return (
    <button
      onClick={() => cb && connect({ connector: cb })}
      disabled={isPending || !cb}
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {isPending ? "Подключение…" : "Подключить кошелёк"}
    </button>
  );
}
