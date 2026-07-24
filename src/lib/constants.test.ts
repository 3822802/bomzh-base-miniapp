import { describe, it, expect } from "vitest";
import { BUILDER_CODE, BUILDER_DATA_SUFFIX, PRIZE_NAMES } from "./constants";

// Самый ценный тест в проекте: суффикс атрибуции легко перепутать, и ошибка
// молчаливая — транзакции уходят в статистику ЧУЖОЙ апки, а внешне всё работает.
// Ровно это однажды и случилось: стоял код от другого приложения владельца.
describe("билдер-атрибуция", () => {
  it("суффикс начинается с hex-кодировки самого билдер-кода", () => {
    const hex = Buffer.from(BUILDER_CODE, "ascii").toString("hex");
    expect(BUILDER_DATA_SUFFIX.slice(2, 2 + hex.length)).toBe(hex);
  });

  it("байт длины совпадает с длиной билдер-кода", () => {
    const hex = Buffer.from(BUILDER_CODE, "ascii").toString("hex");
    const lengthByte = BUILDER_DATA_SUFFIX.slice(2 + hex.length, 4 + hex.length);
    expect(parseInt(lengthByte, 16)).toBe(BUILDER_CODE.length);
  });

  it("суффикс — валидная hex-строка чётной длины", () => {
    expect(BUILDER_DATA_SUFFIX).toMatch(/^0x[0-9a-f]+$/);
    expect((BUILDER_DATA_SUFFIX.length - 2) % 2).toBe(0);
  });

  it("код имеет ожидаемый формат bc_*", () => {
    expect(BUILDER_CODE).toMatch(/^bc_[a-z0-9]+$/);
  });
});

describe("названия призов", () => {
  it("индекс 0 пустой — призы нумеруются с 1, как в контракте", () => {
    expect(PRIZE_NAMES[0]).toBe("");
  });

  it("ровно четыре приза", () => {
    expect(PRIZE_NAMES.filter(Boolean)).toHaveLength(4);
  });
});
