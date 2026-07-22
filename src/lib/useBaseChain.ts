"use client";

import { useCallback } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";

// Кошелёк по умолчанию сидит на Ethereum, и тогда ломается всё сразу:
// транзакция уходит не в ту сеть, а подпись x402 (EIP-3009) считается для
// chainId 1 и не совпадает с требованием сервера (8453).
// Поэтому перед КАЖДЫМ действием переключаем сеть и ждём подтверждения.
export function useEnsureBase() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  return useCallback(async () => {
    if (chainId === base.id) return;
    await switchChainAsync({ chainId: base.id });
  }, [chainId, switchChainAsync]);
}
