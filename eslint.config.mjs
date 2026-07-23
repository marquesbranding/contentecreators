import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        {
          type: "app",
          pattern: "src/app",
          partialMatch: false,
        },
        {
          type: "feature",
          pattern: "src/features/(*)",
          capture: ["featureName"],
          partialMatch: false,
        },
        {
          type: "db",
          pattern: "src/db",
          partialMatch: false,
        },
        {
          type: "shared",
          pattern: "src/shared",
          partialMatch: false,
        },
        {
          type: "shared",
          pattern: "src/registry",
          partialMatch: false,
        },
        {
          type: "test",
          pattern: "src/test",
          partialMatch: false,
        },
      ],
      "boundaries/files": [
        {
          category: "test",
          pattern: "**/*.{test,spec}.{ts,tsx}",
        },
      ],
    },
    rules: {
      ...boundaries.configs.recommended.rules,
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "Dependency outside the approved app/feature/shared/db slice graph.",
          policies: [
            {
              allow: {
                to: {
                  module: {
                    origin: "external",
                  },
                },
              },
            },
            {
              from: {
                element: {
                  type: "app",
                },
              },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["app", "feature", "shared"],
                    },
                  },
                },
              },
            },
            {
              from: {
                element: {
                  type: "feature",
                },
              },
              allow: {
                to: [
                  {
                    element: {
                      type: "feature",
                      captured: {
                        featureName: "{{from.element.captured.featureName}}",
                      },
                    },
                  },
                  {
                    element: {
                      type: "feature",
                      captured: {
                        featureName: "audit",
                      },
                    },
                  },
                  {
                    element: {
                      types: {
                        anyOf: ["shared", "db"],
                      },
                    },
                  },
                ],
              },
            },
            {
              from: {
                element: {
                  type: "shared",
                },
              },
              allow: {
                to: {
                  element: {
                    type: "shared",
                  },
                },
              },
            },
            {
              from: {
                element: {
                  type: "db",
                },
              },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["db", "shared"],
                    },
                  },
                },
              },
            },
            {
              from: {
                element: {
                  type: "test",
                },
              },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["app", "feature", "db", "shared", "test"],
                    },
                  },
                },
              },
            },
            {
              from: {
                file: {
                  categories: "test",
                },
              },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["app", "feature", "db", "shared", "test"],
                    },
                  },
                },
              },
            },
            {
              from: {
                file: {
                  categories: "!test",
                },
              },
              disallow: {
                to: {
                  file: {
                    categories: "test",
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/features/[^/]+/(?!server$).+",
              message:
                "Compose a feature through its client-safe index.ts or guarded server.ts public API.",
            },
            {
              regex: "^@/db(?:/|$)",
              message:
                "App routes compose feature APIs; they do not access the database directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/*/index.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)server(?:/|$)|server-only",
              message:
                "The client-safe index.ts barrel cannot export or import server-only code. Use server.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/features/**/{api,components,hooks,stores}/**/*.{ts,tsx}",
      "src/**/*.client.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(?:@/db|@/shared/server|@/features/[^/]+/server)(?:/|$)|server-only",
              message:
                "Browser-safe modules cannot import database or server-only modules.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
