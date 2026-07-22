import { ConnectButton } from "./ConnectButton";

// Общая шапка: название слева, кнопка кошелька справа.
// dark — для светлого фона (главный экран), иначе белый текст с обводкой.
export function Header({ dark }: { dark?: boolean }) {
  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-3">
      <h1
        className={`text-[13px] leading-5 ${
          dark ? "text-black" : "nes-title-sm text-white"
        }`}
      >
        АИРДРОП
        <br />
        ХАНТЕР
      </h1>
      <ConnectButton />
    </header>
  );
}
