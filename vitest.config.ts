/*
 * vitest.config.ts — unit/permission test runner config.
 * Why: the access-matrix suite runs in a jsdom environment because the demo
 * permission layer persists to localStorage, exactly as the browser does.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
