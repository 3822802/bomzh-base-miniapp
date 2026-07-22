import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";
import { BASE_RPC_URL } from "@/lib/constants";

// Конфиг wagmi: только Base mainnet.
// Стек по актуальной доке Base: wagmi + viem + @base-org/account (коннектор baseAccount).
// Farcaster/MiniKit не используются — с 9 апреля 2026 Base App считает апки обычными веб-апками.
// Приватный ключ владельца НИКОГДА не в коде — подпись только в кошельке.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    baseAccount({ appName: "Аирдроп Хантер" }), // Base Account (smart wallet)
    injected(), // обычные EOA-кошельки (Rabby/MetaMask)
  ],
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
