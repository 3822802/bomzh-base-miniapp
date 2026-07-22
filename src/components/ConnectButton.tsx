"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function short(addr: string) {
  return `${addr.slice(0, 5)}…${addr.slice(-3)}`;
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const cls =
    "nes-btn !px-3 !py-2 shrink-0 text-[7px] leading-4 whitespace-nowrap";

  if (isConnected && address) {
    return (
      <button onClick={() => disconnect()} className={`${cls} nes-btn-green`}>
        {short(address)}
      </button>
    );
  }

  // Предпочитаем Base Account (smart wallet), иначе — любой доступный коннектор.
  const cb = connectors.find((c) => c.id === "baseAccount") ?? connectors[0];

  return (
    <button
      onClick={() => cb && connect({ connector: cb })}
      disabled={isPending || !cb}
      className={`${cls} nes-btn-blue disabled:opacity-60`}
    >
      {isPending ? (
        "СЕКУНДУ…"
      ) : (
        <>
          ПОДКЛЮЧИТЬ
          <br />
          КОШЕЛЁК
        </>
      )}
    </button>
  );
}
