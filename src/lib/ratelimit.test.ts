import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "./ratelimit";

// Ограничитель частоты — защитный механизм: он прикрывает платный ключ
// Anthropic от флуда. Проверять его «по факту» дорого (нужны сотни запросов),
// поэтому тестируем логику напрямую.

const reqFrom = (ip: string) =>
  new NextRequest("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });

describe("ограничитель частоты", () => {
  it("пропускает ровно limit запросов, следующий отбивает 429", () => {
    const req = reqFrom("10.0.0.1");
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(req, "t-basic", 3, 60_000)).toBeNull();
    }
    const blocked = rateLimit(req, "t-basic", 3, 60_000);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("в отказе есть retry-after, чтобы клиент знал когда повторить", () => {
    const req = reqFrom("10.0.0.2");
    rateLimit(req, "t-retry", 1, 60_000);
    const blocked = rateLimit(req, "t-retry", 1, 60_000);
    expect(blocked!.headers.get("retry-after")).toMatch(/^\d+$/);
  });

  it("у разных IP отдельные счётчики — один не блокирует другого", () => {
    expect(rateLimit(reqFrom("10.0.0.3"), "t-ips", 1, 60_000)).toBeNull();
    // Лимит первого исчерпан, но второй IP не должен пострадать.
    expect(rateLimit(reqFrom("10.0.0.3"), "t-ips", 1, 60_000)).not.toBeNull();
    expect(rateLimit(reqFrom("10.0.0.4"), "t-ips", 1, 60_000)).toBeNull();
  });

  it("у разных маршрутов отдельные счётчики", () => {
    const req = reqFrom("10.0.0.5");
    expect(rateLimit(req, "t-route-a", 1, 60_000)).toBeNull();
    expect(rateLimit(req, "t-route-a", 1, 60_000)).not.toBeNull();
    // Другой маршрут — свой лимит, чужой расход на него не влияет.
    expect(rateLimit(req, "t-route-b", 1, 60_000)).toBeNull();
  });

  it("счётчик обнуляется после окна", async () => {
    const req = reqFrom("10.0.0.6");
    expect(rateLimit(req, "t-window", 1, 60)).toBeNull();
    expect(rateLimit(req, "t-window", 1, 60)).not.toBeNull();
    await new Promise((r) => setTimeout(r, 90));
    expect(rateLimit(req, "t-window", 1, 60)).toBeNull();
  });

  it("запрос без заголовков IP всё равно ограничивается, а не падает", () => {
    const bare = new NextRequest("http://localhost/api/test");
    expect(rateLimit(bare, "t-noip", 1, 60_000)).toBeNull();
    expect(rateLimit(bare, "t-noip", 1, 60_000)).not.toBeNull();
  });
});
