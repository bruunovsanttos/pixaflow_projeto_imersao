import {
  defineConfig,
  devices,
} from "@playwright/test";

const AUTH_FILE =
  "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",

  timeout: 60_000,

  expect: {
    timeout: 15_000,
  },

  retries: 1,

  workers: 1,

  reporter: [
    ["list"],

    [
      "html",
      {
        outputFolder:
          "playwright-report",

        open: "never",
      },
    ],
  ],

  use: {
    baseURL:
      process.env.NEXORA_E2E_URL ??
      "https://pixaflow-projeto-imersao.onrender.com",

    trace:
      "retain-on-failure",

    screenshot:
      "only-on-failure",

    video:
      "retain-on-failure",
  },

  projects: [
    {
      name: "setup",

      testMatch:
        /.*\.setup\.ts/,
    },

    {
      name: "chromium",

      dependencies: [
        "setup",
      ],

      testIgnore:
        /.*\.setup\.ts/,

      use: {
        ...devices[
          "Desktop Chrome"
        ],

        storageState:
          AUTH_FILE,
      },
    },
  ],
});