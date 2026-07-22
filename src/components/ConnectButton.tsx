"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function short(addr: string) {
  return `${addr.slice(0, 5)}…${addr.slice(-3)}`;
}

// Подписи коннекторов. Base Account создаёт СВОЙ адрес (smart wallet) —
// это не тот же кошелёк, что в расширении. Поэтому выбор всегда за
// пользователем, иначе легко подключиться не тем адресом.
const LABELS: Record<string, string> = {
  baseAccount: "BASE ACCOUNT",
  injected: "РАСШИРЕНИЕ",
};

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  const cls =
    "nes-btn !px-3 !py-2 shrink-0 text-[7px] leading-4 whitespace-nowrap";

  if (isConnected && address) {
    return (
      <button onClick={() => disconnect()} className={`${cls} nes-btn-green`}>
        {short(address)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
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

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="nes-box w-full max-w-[300px] text-[8px]"
          >
            <p className="mb-2 leading-5">ЧЕМ ПОДКЛЮЧИТЬСЯ?</p>
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect({ connector: c });
                  setOpen(false);
                }}
                className="nes-menu-item"
              >
                <span className="nes-caret">▶</span>
                {LABELS[c.id] ?? c.name.toUpperCase()}
              </button>
            ))}
            <button onClick={() => setOpen(false)} className="nes-menu-item">
              <span className="nes-caret">▶</span>ОТМЕНА
            </button>
          </div>
        </div>
      )}
    </>
  );
}
