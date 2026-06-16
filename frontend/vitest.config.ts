/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Vitest config. Co-locates tests with sources via the `*.test.ts(x)` glob and
 * runs them in a jsdom environment so React components and DOM APIs work.
 *
 * CSS Modules are mocked to identity-mapped strings so tests can match class
 * names by their *source* name (e.g. `styles.cardSelected → "cardSelected"`)
 * without depending on Vite's hashed output.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    // src/ holds co-located unit tests; tests/ holds cross-cutting guards
    // (e.g. the case-sensitive-import build check).
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    css: {
      modules: {
        // `non-scoped` returns the source class name unchanged. Lets tests
        // assert on `cardSelected` rather than `_cardSelected_1g0oz_60`.
        classNameStrategy: "non-scoped",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "tests/", "**/*.test.{ts,tsx}", "**/*.config.{ts,js}"],
    },
  },
});
