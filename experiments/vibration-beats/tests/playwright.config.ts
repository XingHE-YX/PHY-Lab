import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import platform from "../../../playwright.config";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const url = "http://127.0.0.1:4174";

export default defineConfig({
  ...platform,
  testDir: ".",
  outputDir: `${root}/test-results/vibration-beats`,
  use: { ...platform.use, baseURL: url },
  webServer: {
    command: "bun scripts/test-server.ts",
    cwd: root,
    env: { PORT: "4174" },
    url,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
