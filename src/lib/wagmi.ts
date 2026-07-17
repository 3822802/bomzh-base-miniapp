import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { BASE_RPC_URL } from "@/lib/constants";

// Конфиг wagmi: только Base mainnet.
// Кошелёк подключается на клиенте; приватный ключ владельца НИКОГДА не в коде.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: "Bomzh", preference: "all" }),
    injected(),
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
