import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount, coinbaseWallet, injected } from "wagmi/connectors";
import { BASE_RPC_URL } from "@/lib/constants";

// Конфиг wagmi: только Base mainnet.
// Стек по актуальной доке Base: wagmi + viem + @base-org/account (коннектор baseAccount).
// Farcaster/MiniKit не используются — с 9 апреля 2026 Base App считает апки обычными веб-апками.
// Приватный ключ владельца НИКОГДА не в коде — подпись только в кошельке.
export const wagmiConfig = createConfig({
  chains: [base],
  // Rabby / MetaMask / Phantom и прочие расширения приходят сами через
  // EIP-6963 (multiInjectedProviderDiscovery включён в wagmi по умолчанию) —
  // каждое отдельным коннектором со своим именем и иконкой.
  // Здесь перечисляем только то, что через 6963 не находится.
  connectors: [
    baseAccount({ appName: "Аирдроп Хантер" }), // вход по passkey (smart wallet)
    coinbaseWallet({ appName: "Аирдроп Хантер", preference: "eoaOnly" }),
    injected(), // запасной вариант, если 6963 ничего не нашёл
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
