"use client";

import { useState } from "react";
import { useAccount, useConfig, useWriteContract, usePublicClient } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { base } from "wagmi/chains";
import { publicActions } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";
import { Header } from "./Header";
import { useEnsureBase } from "@/lib/useBaseChain";
import {
  CONTRACTS,
  BUILDER_DATA_SUFFIX,
  BUY_PAYMENT_WEI,
  GAS,
} from "@/lib/constants";
import { SALE_ABI } from "@/lib/abis";

type Status = "buy_ok" | "buy_fail" | "x402_ok" | "x402_fail";

// Короткая понятная причина вместо простыни из кошелька.
function reason(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();

  if (m.includes("user rejected") || m.includes("denied")) return "отмена в кошельке";
  if (m.includes("insufficient funds")) return "не хватает ETH на газ";
  if (m.includes("chain") && m.includes("match")) return "кошелёк не в сети Base";
  if (m.includes("insufficient") && m.includes("balance")) return "не хватает USDC";

  // Типичные отказы x402: подпись живёт ограниченное время и одноразовая,
  // поэтому «просрочено» и «повтор» лечатся просто повторным нажатием.
  if (m.includes("expired") || m.includes("validbefore"))
    return "подпись просрочена — нажми ещё раз";
  if (m.includes("nonce") || m.includes("already used"))
    return "подпись уже использована — нажми ещё раз";
  // Один и тот же адрес подписывает по-разному в зависимости от кошелька:
  // обычный кошелёк (MetaMask/Rabby) даёт классическую подпись, которую сервис
  // принимает, а встроенный кошелёк Base App — подпись смарт-аккаунта
  // (ERC-1271), и её x402-фасилитатор не проверяет. Поэтому дело не в адресе
  // и не в балансе, а в том, ЧЕМ подписано — и подсказываем именно это.
  if (m.includes("signature") || m.includes("invalid") || m.includes("verification failed"))
    return "этот кошелёк подписывает в формате, который сервис x402 не принимает. Открой апку в обычном браузере с MetaMask или Rabby — там проходит";

  // Ничего не распознали — показываем текст целиком, а не обрезанный кусок:
  // раньше обрезка на 60 символах отрезала ровно поле с причиной.
  return raw;
}

// Экран ФАРМ. Ровно два действия, поля ввода нет.
// Действия выполняются кодом детерминированно; ИИ-агент только озвучивает итог
// (у модели нет инструментов и она не получает пользовательский текст).
export function AgentScreen({ onBack }: { onBack: () => void }) {
  const { isConnected } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const ensureBase = useEnsureBase();

  const sale = CONTRACTS.sale;
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  // Пояснение, которое висит ПОКА идёт действие: кошелёк в этот момент может
  // показать пугающее предупреждение, и человек должен понимать, что это норма.
  const [notice, setNotice] = useState<string | null>(null);

  // Спрашиваем у агента фразу по закрытому статусу.
  async function phrase(status: Status): Promise<string> {
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      return typeof data.text === "string" && data.text
        ? data.text
        : status.endsWith("_ok")
        ? "Сделано!"
        : "Не получилось.";
    } catch {
      return status.endsWith("_ok") ? "Сделано!" : "Не получилось.";
    }
  }

  // Покупка: сумма ЖЁСТКО задана приложением (1000 BMZH).
  async function buy(): Promise<boolean> {
    if (!sale || !publicClient) return false;
    await ensureBase();
    const hash = await writeContractAsync({
      address: sale as `0x${string}`,
      abi: SALE_ABI,
      functionName: "buy",
      chainId: base.id, // без этого транзакция уходит в текущую сеть кошелька
      value: BUY_PAYMENT_WEI,
      gas: GAS.buy, // явный лимит: BMZH — прекомпайл, кошельки его занижают
      dataSuffix: BUILDER_DATA_SUFFIX, // атрибуция билдера
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt.status === "success";
  }

  // x402-касание: платим $0.001 USDC кошельком пользователя.
  // Сервер сам диктует актив (USDC) и схему exact — она построена на
  // EIP-3009 transferWithAuthorization, то есть работает только с ERC-20.
  // Ходим через свой /api/x402 — прямой запрос на чужой домен рвался
  // с «Failed to fetch» уже ПОСЛЕ успешной подписи.
  async function x402(): Promise<boolean> {
    await ensureBase();

    // Берём клиент ПОСЛЕ переключения сети: хук ещё отдал бы старый,
    // и подпись ушла бы с чужим chainId.
    const wc = await getWalletClient(config, { chainId: base.id });
    if (!wc) throw new Error("кошелёк недоступен");
    const signer = wc.extend(publicActions) as unknown as Parameters<
      typeof wrapFetchWithPayment
    >[1];
    const res = await wrapFetchWithPayment(fetch, signer)("/api/x402");
    if (!res.ok) {
      // Достаём именно поле с причиной, а не первые 60 символов сырого JSON:
      // раньше обрезка приходилась ровно на "reason", и было не понять, что не так.
      // Тело читаем ОДИН раз — повторный res.json()/res.text() бросил бы
      // "body already read" и подменил настоящую ошибку своей.
      const body = await res.text().catch(() => "");
      let detail = body.slice(0, 160);
      try {
        const j = JSON.parse(body) as Record<string, unknown>;
        const fields = [j.reason, j.error, j.message].filter(
          (v): v is string => typeof v === "string" && v.length > 0
        );
        if (fields.length) detail = fields.join(" · ");
      } catch {
        /* не JSON — оставляем сырой текст */
      }
      throw new Error(detail || `сервер ответил ${res.status}`);
    }
    return true;
  }

  async function run(
    action: () => Promise<boolean>,
    ok: Status,
    fail: Status,
    warn?: string
  ) {
    setBusy(true);
    setReply(null);
    setDetail(null);
    setNotice(warn ?? null);
    try {
      const done = await action();
      setReply(await phrase(done ? ok : fail));
      if (!done) setDetail("транзакция не прошла");
    } catch (e) {
      setReply(await phrase(fail));
      setDetail(reason(e));
    }
    setNotice(null);
    setBusy(false);
  }

  const locked = !isConnected || busy;

  return (
    <div className="flex h-full flex-col bg-[#7b7bef]">
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <Header />

        {/* Реплика агента. aria-live — текст подменяется по ходу действия
            (работаю → результат → причина ошибки), надо озвучивать. */}
        <div role="status" aria-live="polite" className="nes-box shrink-0 text-[8px]">
          {busy
            ? "Секунду, работаю…"
            : reply ??
              "Привет! я искусственный интеллект который поможет тебе разбогатеть"}
          {notice && busy && (
            <div className="mt-2 text-[7px] leading-4 text-[#ffd93b]">
              {notice}
            </div>
          )}
          {detail && !busy && (
            // Причина может быть длинной и без пробелов (JSON, адреса) —
            // break-words не даёт ей распереть блок за края экрана,
            // max-h со скроллом не даёт вытеснить картинку агента.
            <div className="mt-1 max-h-24 overflow-y-auto text-[7px] leading-4 break-words text-[#ff9a9a]">
              ({detail})
            </div>
          )}
        </div>

        {/* Картинка агента. contain + пропорции самого файла (1032×617):
            кадр виден целиком и без чёрных полей по краям рамки. */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            role="img"
            aria-label="ИИ-агент Бомж"
            className="nes-frame w-full bg-contain bg-center bg-no-repeat"
            // Ширина — как у чёрных диалогов сверху и снизу, без своего
            // ограничения. Пропорции инлайном: утилита aspect-[…] с дробью
            // не собралась, а от неё зависит, не схлопнется ли рамка в полоску.
            style={{
              backgroundImage: "url(/img/agent.png)",
              aspectRatio: "1032 / 617",
              maxHeight: "100%",
            }}
          />
        </div>

        {/* Меню. Ровно три пункта — ничего другого агент делать не умеет. */}
        <div className="nes-box shrink-0 text-[8px]">
          <button
            onClick={() => run(buy, "buy_ok", "buy_fail")}
            disabled={locked || !sale}
            className="nes-menu-item"
          >
            <span className="nes-caret">▶</span> КУПИТЬ BMZH- B20
          </button>
          <button
            onClick={() =>
              run(
                x402,
                "x402_ok",
                "x402_fail",
                "Кошелёк покажет красное предупреждение: получатель — обычный адрес (EOA). Так и должно быть: это счёт сервиса x402. Списывается ровно $0.001 USDC, разрешение разовое."
              )
            }
            disabled={locked}
            className="nes-menu-item"
          >
            <span className="nes-caret">▶</span> КОСНУТЬСЯ X402
          </button>
          <button onClick={onBack} disabled={busy} className="nes-menu-item">
            <span className="nes-caret">▶</span> НАЗАД
          </button>
        </div>

        {!isConnected && (
          <p className="shrink-0 text-center text-[7px] leading-4 text-white [text-shadow:2px_2px_0_#000]">
            СНАЧАЛА ПОДКЛЮЧИ КОШЕЛЁК
          </p>
        )}
      </main>
    </div>
  );
}
