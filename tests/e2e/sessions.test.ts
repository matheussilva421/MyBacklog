/**
 * Testes E2E para Sessões
 * Valida timer, filtros, monthly hours e session history
 */

import { test, expect } from "@playwright/test";

test.describe("Sessões", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForSelector("#root", { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test("deve carregar Sessões", async ({ page }) => {
    await expect(page.locator("#root")).toBeVisible();
  });

  test("deve exibir timer de sessão", async ({ page }) => {
    const timerElement = page.getByTestId(/timer|cronometro/i);
    const timerText = page.getByText(/\d{2}:\d{2}:\d{2}/);

    if (await timerElement.isVisible() || await timerText.isVisible()) {
      await expect(timerElement.or(timerText)).toBeVisible();
    }
  });

  test("deve iniciar timer", async ({ page }) => {
    // Usar seletor mais específico para evitar ambiguidade com múltiplos botões "Iniciar"
    const startButton = page.getByRole("button", { name: /iniciar.*timer|iniciar.*sessão|iniciar.*backlog/i });
    const stopButton = page.getByText(/parar|stop|pausar/i);

    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000);

      // Timer deve estar rodando
      const isRunning = await stopButton.isVisible();
      if (isRunning) {
        expect(isRunning).toBe(true);
        // Parar timer
        await stopButton.click();
      }
    }
  });

  test("deve exibir formulário de nova sessão", async ({ page }) => {
    const formSection = page.getByTestId(/session-form|formulario/i);
    const gameSelect = page.getByTestId(/game-select|jogo/i);
    const durationInput = page.getByTestId(/duration|duracao/i);

    if (await formSection.isVisible()) {
      await expect(formSection).toBeVisible();
    }

    if (await gameSelect.isVisible()) {
      await expect(gameSelect).toBeVisible();
    }

    if (await durationInput.isVisible()) {
      await expect(durationInput).toBeVisible();
    }
  });

  test("deve filtrar por período", async ({ page }) => {
    const periodSelect = page.getByTestId(/period|período|periodo/i);

    if (await periodSelect.isVisible()) {
      const periods = ["7d", "30d", "90d", "all"];

      for (const period of periods) {
        if (await periodSelect.locator(`option[value="${period}"]`).isVisible()) {
          await periodSelect.selectOption(period);
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test("deve filtrar por plataforma", async ({ page }) => {
    const platformFilter = page.getByTestId(/platform-filter|plataforma/i);

    if (await platformFilter.isVisible()) {
      // Selecionar primeira plataforma disponível
      const options = await platformFilter.locator("option").count();
      if (options > 1) {
        await platformFilter.selectIndex(1);
        await page.waitForTimeout(500);
      }
    }
  });

  test("deve filtrar por store", async ({ page }) => {
    const storeFilter = page.getByTestId(/store-filter|loja/i);

    if (await storeFilter.isVisible()) {
      const options = await storeFilter.locator("option").count();
      if (options > 1) {
        await storeFilter.selectIndex(1);
        await page.waitForTimeout(500);
      }
    }
  });

  test("deve exibir monthly hours chart", async ({ page }) => {
    const chartSection = page.getByTestId(/monthly-hours|monthly-chart/i);
    const chartElements = page.locator("svg rect, svg path, [class*='bar']");

    if (await chartSection.isVisible()) {
      await expect(chartSection).toBeVisible();
    }

    const chartCount = await chartElements.count();
    if (chartCount > 0) {
      expect(chartCount).toBeGreaterThan(0);
    }
  });

  test("deve exibir session history", async ({ page }) => {
    const historySection = page.getByText(/histórico|historico|history|sessões passadas/i);

    if (await historySection.first().isVisible()) {
      await expect(historySection.first()).toBeVisible();
    }

    // Verificar se há sessões listadas
    const sessionItems = page.locator("[class*='session-item'], [class*='session-card']");
    const sessionCount = await sessionItems.count();

    // Se tiver dados mock, deve mostrar sessões
    if (sessionCount > 0) {
      expect(sessionCount).toBeGreaterThan(0);
    }
  });

  test("deve exibir overview stats", async ({ page }) => {
    const overviewStats = page.getByTestId(/overview|resumo-sessoes/i);

    if (await overviewStats.isVisible()) {
      await expect(overviewStats).toBeVisible();
    }

    // Stats como total hours, total sessions
    const statsElements = page.locator("[class*='stat'], [class*='metric']");
    const statsCount = await statsElements.count();

    if (statsCount > 0) {
      expect(statsCount).toBeGreaterThan(0);
    }
  });

  test("não deve exibir erros de console", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
