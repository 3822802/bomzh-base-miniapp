import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Тот же алиас, что в tsconfig — чтобы импорты "@/lib/..." работали в тестах.
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
