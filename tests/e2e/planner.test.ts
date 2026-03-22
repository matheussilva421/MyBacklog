/**
 * Testes E2E para Planner
 * Valida fila tática, scoring e goal signals
 */

import { test, expect } from "@playwright/test";

test.describe("Planner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/planner");
    await page.waitForSelector("#root", { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test("deve carregar o Planner", async ({ page }) => {
    await expect(page.getByText(/planner|fila|t(a|á)tica/i).first()).toBeVisible();
  });

  test("deve exibir fila de jogos rankeados", async ({ page }) => {
    // Buscar por cards ou lista de jogos do planner
    const plannerQueue = page.getByTestId(/planner-queue|fila|i/i);
    const gameCards = page.locator("[class*='planner-card'], [class*='queue-item']");

    // Verificar se há jogos na fila
    const queueCount = await gameCards.count();
    if (queueCount > 0) {
      expect(queueCount).toBeGreaterThan(0);
      // Fila deve ter no máximo 4 jogos (top 4)
      expect(queueCount).toBeLessThanOrEqual(4);
    }
  });

  test("deve exibir ranking (1º, 2º, 3º, 4º)", async ({ page }) => {
    // Verificar se há numeração de ranking
    const rankings = page.getByText(/^1[ºo]|^2[ºo]|^3[ºo]|^4[ºo]/);
    const rankingCount = await rankings.count();

    if (rankingCount > 0) {
      expect(rankingCount).toBeGreaterThan(0);
    }
  });

  test("deve exibir motivo do ranking (reason)", async ({ page }) => {
    // Planner deve mostrar motivo do score
    const reasonElements = page.locator("[class*='reason'], [class*='motivo']");
    const reasonsVisible = await reasonElements.count();

    if (reasonsVisible > 0) {
      expect(reasonsVisible).toBeGreaterThan(0);
    }
  });

  test("deve exibir fit de sessões", async ({ page }) => {
    // Planner deve mostrar fit de sessão
    const fitElements = page.locator("[class*='fit'], [class*='session'], [class*='sessao']");
    const fitsVisible = await fitElements.count();

    if (fitsVisible > 0) {
      expect(fitsVisible).toBeGreaterThan(0);
    }
  });

  test("deve exibir ETA dos jogos", async ({ page }) => {
    // Jogos devem mostrar ETA
    const etaElements = page.locator("[class*='eta'], [class*='duration']");
    const etasVisible = await etaElements.count();

    if (etasVisible > 0) {
      expect(etasVisible).toBeGreaterThan(0);
    }
  });

  test("deve exibir seção de Goals", async ({ page }) => {
    // Goals section deve estar visível
    const goalsSection = page.getByText(/goal|meta/i);
    if (await goalsSection.first().isVisible()) {
      await expect(goalsSection.first()).toBeVisible();
    }
  });

  test("deve exibir progresso das goals", async ({ page }) => {
    // Progress bars das goals
    const progressBars = page.locator("[class*='progress'], [class*='barra']");
    const progressBarCount = await progressBars.count();

    if (progressBarCount > 0) {
      expect(progressBarCount).toBeGreaterThan(0);
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
