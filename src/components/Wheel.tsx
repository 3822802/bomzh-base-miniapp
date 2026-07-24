"use client";

// ── КОЛЕСО АИРДРОПА (только отрисовка) ────────────────────────────────────
// 8 секторов: TIER 1 встречается 5 раз, TIER 2 / TIER 3 / ПОДАРОК — по одному.
// В каждом секторе: миниатюра приза у края + подпись ранга ближе к центру.
//
// Вращением управляет родитель (RouletteScreen) — он знает результат
// из контракта, поэтому колесо всегда останавливается на правде.
// ───────────────────────────────────────────────────────────────────────────

export const PRIZES = [
  { id: 1, name: "TIER 1", img: "/nft/1.png", color: "#f5d76e" },
  { id: 2, name: "TIER 2", img: "/nft/2.png", color: "#9fd8f5" },
  { id: 3, name: "TIER 3", img: "/nft/3.png", color: "#8fd88f" },
  { id: 4, name: "ПОДАРОК ОТ БЫВШЕЙ", img: "/nft/4.png", color: "#f4a3a3" },
];

// Раскладка секторов: TIER 1 — пять раз, остальные по одному.
export const LAYOUT = [1, 2, 1, 3, 1, 4, 1, 1];

const N = LAYOUT.length;
export const STEP = 360 / N;
const R = 152;
const C = 168;

const rad = (d: number) => (d * Math.PI) / 180;

function arc(i: number) {
  const a0 = i * STEP - 90 - STEP / 2;
  const a1 = a0 + STEP;
  const x0 = C + R * Math.cos(rad(a0));
  const y0 = C + R * Math.sin(rad(a0));
  const x1 = C + R * Math.cos(rad(a1));
  const y1 = C + R * Math.sin(rad(a1));
  return `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`;
}

// точка на биссектрисе сектора на заданном радиусе
function at(i: number, r: number) {
  const a = rad(i * STEP - 90);
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

export function Wheel({ rot, spinning }: { rot: number; spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 336 336"
      role="img"
      aria-label={
        spinning
          ? "Колесо аирдропа крутится"
          : "Колесо аирдропа: восемь секторов с призами"
      }
      className="w-full"
      // Ширину ограничиваем и по высоте экрана: на низких телефонах колесо
      // ужимается само и не выталкивает кнопки за пределы окна.
      style={{
        maxWidth: "min(310px, 58vh)",
        transform: `rotate(${rot}deg)`,
        transition: spinning ? "transform 4s cubic-bezier(.17,.67,.2,1)" : "none",
      }}
    >
      {/* обод */}
      <circle cx={C} cy={C} r={R + 13} fill="#3d4451" />
      {[...Array(12)].map((_, i) => {
        const a = rad(i * 30 - 90);
        return (
          <circle
            key={i}
            cx={C + (R + 6) * Math.cos(a)}
            cy={C + (R + 6) * Math.sin(a)}
            r="4"
            fill="#fff"
          />
        );
      })}

      {/* сектора */}
      {LAYOUT.map((pid, i) => (
        <path
          key={`s${i}`}
          d={arc(i)}
          fill={PRIZES[pid - 1].color}
          stroke="#3d4451"
          strokeWidth="2"
        />
      ))}

      {/* миниатюры призов — у самого края */}
      {LAYOUT.map((pid, i) => {
        const p = at(i, 112);
        const pr = PRIZES[pid - 1];
        return (
          <g key={`i${i}`}>
            <clipPath id={`clip-${i}`}>
              <circle cx={p.x} cy={p.y} r="30" />
            </clipPath>
            <circle
              cx={p.x}
              cy={p.y}
              r="32"
              fill="#fff"
              stroke="#3d4451"
              strokeWidth="2.5"
            />
            <image
              href={pr.img}
              x={p.x - 30}
              y={p.y - 30}
              width="60"
              height="60"
              clipPath={`url(#clip-${i})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        );
      })}

      {/* ПОДПИСИ — рисуются последними, поверх картинок, поэтому не обрезаются */}
      {LAYOUT.map((pid, i) => {
        const pr = PRIZES[pid - 1];
        const long = pr.name.length > 7;

        let x: number;
        let y: number;
        let angle: number;

        if (long) {
          // Кладём надпись ПАРАЛЛЕЛЬНО ребру: не вдоль луча (тогда буквы
          // расходятся веером и хвост уезжает от границы), а со сдвигом
          // на постоянные OFF пикселей внутрь сектора. Первая и последняя
          // буквы отстоят от ребра одинаково.
          const edge = i * STEP - 90 - STEP / 2;
          const MID = 90; // положение центра надписи вдоль ребра
          const OFF = 10; // отступ от ребра внутрь сектора
          angle = edge;
          x = C + MID * Math.cos(rad(edge)) + OFF * Math.cos(rad(edge + 90));
          y = C + MID * Math.sin(rad(edge)) + OFF * Math.sin(rad(edge + 90));
        } else {
          angle = i * STEP - 90;
          x = C + 62 * Math.cos(rad(angle));
          y = C + 62 * Math.sin(rad(angle));
        }

        // Короткие НЕ переворачиваем. Переворот на 180° менял порядок:
        // в трёх секторах цифра оказывалась у центра, а слово — у обода.
        const flip = long && (angle > 90 || angle < -90);

        return (
          <text
            key={`t${i}`}
            x={x}
            y={y}
            transform={`rotate(${flip ? angle + 180 : angle}, ${x}, ${y})`}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={long ? 9 : 11}
            fontWeight="bold"
            fill="#fff"
            stroke="#000"
            strokeWidth={long ? 3.5 : 3}
            paintOrder="stroke"
            fontFamily="system-ui, sans-serif"
            letterSpacing="0.5"
          >
            {pr.name}
          </text>
        );
      })}

      {/* центр */}
      <circle cx={C} cy={C} r="17" fill="#fff" stroke="#3d4451" strokeWidth="3" />
      <circle cx={C} cy={C} r="7" fill="#ffd93b" />
    </svg>
  );
}
