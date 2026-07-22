"use client";

import { PRIZES } from "./Wheel";

// Хлопушка после прокрута: конфетти, выпавшая NFT и «YOU ARE ELIGIBLE».
// Конфетти — обычные div'ы с CSS-анимацией, без сторонних библиотек:
// апка должна оставаться самодостаточной.
const COLORS = ["#ffd93b", "#5fbf4a", "#4a7fd4", "#e8a24c", "#d4483f", "#fff"];
const COUNT = 44;

export function Celebration({
  prize,
  onClose,
}: {
  prize: number;
  onClose: () => void;
}) {
  const pr = PRIZES[prize - 1];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 p-5"
    >
      {/* конфетти */}
      {Array.from({ length: COUNT }, (_, i) => (
        <span
          key={i}
          className="nes-confetti"
          style={{
            left: `${(i * 97) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 11) * 0.13}s`,
            animationDuration: `${2.2 + ((i * 7) % 13) * 0.1}s`,
            width: i % 3 === 0 ? 10 : 7,
            height: i % 4 === 0 ? 7 : 11,
          }}
        />
      ))}

      <div
        onClick={(e) => e.stopPropagation()}
        className="nes-box relative z-10 w-full max-w-[300px] text-center"
      >
        <p className="nes-pop text-[11px] leading-6 text-[#ffd93b]">
          YOU ARE
          <br />
          ELIGIBLE!
        </p>

        {/* Картинки призов — тёмные объекты на прозрачном фоне с мягкими
            краями после вырезания. На чёрной подложке они сливались, а остатки
            фона читались как разводы. Поэтому кладём их на белое поле —
            так же, как на колесе, где кружки под миниатюрами белые. */}
        <div className="nes-frame mx-auto mt-3 w-[150px] bg-white p-2">
          <div
            className="aspect-square w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${pr.img})` }}
          />
        </div>

        <p className="mt-3 text-[9px] leading-5 text-[#ffd93b]">{pr.name}</p>
        <p className="mt-1 text-[7px] leading-4 text-white/60">
          NFT УЖЕ В КОШЕЛЬКЕ
        </p>

        <button
          onClick={onClose}
          className="nes-btn nes-btn-green mt-4 w-full text-[10px]"
        >
          ЗАБРАТЬ
        </button>
      </div>
    </div>
  );
}
