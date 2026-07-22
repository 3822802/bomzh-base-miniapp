"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";

function short(addr: string) {
  return `${addr.slice(0, 5)}…${addr.slice(-3)}`;
}

// Понятные подписи для тех коннекторов, чьё имя ничего не говорит.
const LABELS: Record<string, string> = {
  baseAccount: "BASE ACCOUNT (PASSKEY)",
  metaMaskSDK: "METAMASK",
  injected: "БРАУЗЕРНЫЙ КОШЕЛЁК",
};

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);

  const cls =
    "nes-btn !px-3 !py-2 shrink-0 text-[7px] leading-4 whitespace-nowrap";

  if (isConnected && address) {
    // Не та сеть — самая частая причина «ничего не работает». Показываем прямо
    // в шапке и чиним одним нажатием.
    if (chainId !== base.id) {
      return (
        <button
          onClick={() => switchChain({ chainId: base.id })}
          className={`${cls} nes-btn-red`}
        >
          НЕ ТА СЕТЬ
          <br />
          ВКЛЮЧИТЬ BASE
        </button>
      );
    }
    return (
      <button onClick={() => disconnect()} className={`${cls} nes-btn-green`}>
        {short(address)}
      </button>
    );
  }

  // Порядок: сначала расширения, найденные через EIP-6963 (Rabby, MetaMask и
  // прочие — со своими именами и иконками), затем явные варианты.
  // Дедуп по имени: если MetaMask уже нашёлся сам, отдельный пункт не нужен.
  const discovered = connectors.filter(
    (c) => c.type === "injected" && c.id !== "injected"
  );
  const seen = new Set(discovered.map((c) => c.name.toLowerCase()));
  const order = ["metaMaskSDK", "injected", "baseAccount"];
  const explicit = order
    .map((id) => connectors.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => c.id === "injected" || !seen.has(c.name.toLowerCase()));
  const list = [...discovered, ...explicit];

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
            className="nes-box max-h-[80dvh] w-full max-w-[300px] overflow-y-auto text-[8px]"
          >
            <p className="mb-2 leading-5">ЧЕМ ПОДКЛЮЧИТЬСЯ?</p>
            {list.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect({ connector: c, chainId: base.id });
                  setOpen(false);
                }}
                className="nes-menu-item"
              >
                {c.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon} alt="" className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="nes-caret">▶</span>
                )}
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
