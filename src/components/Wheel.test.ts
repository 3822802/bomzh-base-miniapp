import { describe, it, expect } from "vitest";
import { LAYOUT, PRIZES, STEP } from "./Wheel";
import { PRIZE_NAMES } from "@/lib/constants";

// Колесо должно совпадать с контрактом: призов ровно 4, они нумеруются с 1,
// а раскладка секторов задаёт видимую редкость. Если LAYOUT и PRIZES разъедутся,
// колесо начнёт рисовать несуществующий приз — тихо и только в одном секторе.
describe("раскладка колеса", () => {
  it("восемь секторов", () => {
    expect(LAYOUT).toHaveLength(8);
  });

  it("шаг сектора делит окружность нацело", () => {
    expect(STEP).toBe(360 / LAYOUT.length);
    expect(STEP * LAYOUT.length).toBe(360);
  });

  it("каждый сектор ссылается на существующий приз", () => {
    for (const id of LAYOUT) {
      expect(PRIZES[id - 1]).toBeDefined();
      expect(PRIZES[id - 1].id).toBe(id);
    }
  });

  it("TIER 1 занимает пять секторов, остальные по одному", () => {
    const count = (id: number) => LAYOUT.filter((x) => x === id).length;
    expect(count(1)).toBe(5);
    expect(count(2)).toBe(1);
    expect(count(3)).toBe(1);
    expect(count(4)).toBe(1);
  });

  it("все четыре приза представлены на колесе", () => {
    expect(new Set(LAYOUT)).toEqual(new Set([1, 2, 3, 4]));
  });
});

describe("призы", () => {
  it("ровно четыре, с id 1..4 по порядку", () => {
    expect(PRIZES).toHaveLength(4);
    expect(PRIZES.map((p) => p.id)).toEqual([1, 2, 3, 4]);
  });

  it("названия совпадают с константами приложения", () => {
    for (const p of PRIZES) {
      expect(p.name).toBe(PRIZE_NAMES[p.id]);
    }
  });

  it("у каждого приза есть картинка и цвет", () => {
    for (const p of PRIZES) {
      expect(p.img).toMatch(/^\/nft\/\d+\.png$/);
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
