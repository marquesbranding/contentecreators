import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));
const serverOnlyStubPath = fileURLToPath(
  new URL("./src/test/server-only.ts", import.meta.url),
);
const resolve = {
  alias: {
    "@": srcPath,
    "server-only": serverOnlyStubPath,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve,
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/features/**/*.{ts,tsx}",
        "src/shared/api/**/*.{ts,tsx}",
        "src/shared/lib/**/*.{ts,tsx}",
        "src/shared/server/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/shared/components/ui/**",
      ],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.unit.test.{ts,tsx}"],
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        plugins: [react()],
        resolve,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.component.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup-component.ts"],
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.{ts,tsx}"],
          globalSetup: ["./src/test/setup-local-stack.ts"],
          setupFiles: ["./src/test/setup-integration.ts"],
          clearMocks: true,
          restoreMocks: true,
          sequence: {
            concurrent: false,
          },
        },
      },
    ],
  },
});
