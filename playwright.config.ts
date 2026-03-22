/**
 * Configuração do Playwright para MyBacklog E2E Tests
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Testes E2E devem rodar sequencialmente por causa do DB
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: 1, // Single worker para garantir isolamento do DB
  reporter: [["html", { open: "never" }], ["list"]],

  // Shared settings for all the projects
  use: {
    baseURL: process.env["BASE_URL"] || "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },

  // Projects para diferentes browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Pode adicionar Firefox e WebKit depois
  ],

  // Setup: iniciar servidor de preview antes dos testes
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env["CI"],
    timeout: 60000,
  },
});
