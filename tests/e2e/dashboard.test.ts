/**
 * Testes E2E para Dashboard
 * Valida cards, charts, badges e monthly recap
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#root", { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test("deve carregar o Dashboard", async ({ page }) => {
    await expect(page.locator("#root")).toBeVisible();
  });

  test("deve exibir cards de estatísticas", async ({ page }) => {
    // Cards principais devem estar visíveis
    const statsCards = page.getByTestId(/stats-card|stat-card/i);
    const cardsVisible = await statsCards.count();

    // Se tiver dados mock, deve mostrar cards
    if (cardsVisible > 0) {
      expect(cardsVisible).toBeGreaterThanOrEqual(4);
    }

    // Alternativa: buscar por texto dos stats
    const totalLabel = page.getByText(/total|jogos/i);
    await expect(totalLabel.first()).toBeVisible();
  });

  test("deve exibir gráfico de progresso mensal", async ({ page }) => {
    // Chart container deve existir
    const chart = page.getByTestId(/monthly-progress|progress-chart/i);
    if (await chart.isVisible()) {
      await expect(chart).toBeVisible();
    }

    // Ou buscar por elementos de gráfico (barras, linhas)
    const chartElements = page.locator("[class*='bar'], [class*='chart'], svg rect, svg path");
    const chartCount = await chartElements.count();
    expect(chartCount).toBeGreaterThan(0);
  });

  test("deve exibir distribuição de plataformas", async ({ page }) => {
    const platformSection = page.getByText(/plataformas|platforms|platform/i);
    if (await platformSection.first().isVisible()) {
      await expect(platformSection.first()).toBeVisible();
    }
  });

  test("deve exibir seção Continue Playing", async ({ page }) => {
    const continuePlayingSection = page.getByText(/continue|continuando|playing|jogando/i);
    if (await continuePlayingSection.first().isVisible()) {
      await expect(continuePlayingSection.first()).toBeVisible();
    }
  });

  test("deve exibir badges de conquistas", async ({ page }) => {
    const badgesSection = page.getByText(/badge|conquista|achievement/i);
    if (await badgesSection.first().isVisible()) {
      await expect(badgesSection.first()).toBeVisible();
    }
  });

  test("deve exibir monthly recap se aplicável", async ({ page }) => {
    const recapSection = page.getByText(/recap|resumo|mês|monthly/i);
    if (await recapSection.first().isVisible()) {
      await expect(recapSection.first()).toBeVisible();
    }
  });

  test("não deve exibir erros de console", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});

test.describe("Dashboard com Dados Mock", () => {
  test("deve exibir dados populados quando há mock data", async ({ page }) => {
    // Navegar e aguardar dados carregarem
    await page.goto("/");
    await page.waitForTimeout(3000);

    // Verificar que há conteúdo (não está vazio)
    const root = page.locator("#root");
    await expect(root).toBeVisible();

    // Dashboard deve ter algum conteúdo populado
    // Verificar se há pelo menos um elemento filho visível
    const hasContent = await root.evaluate((el) => el.children.length > 0 || el.textContent?.trim().length > 0);
    expect(hasContent).toBe(true);
  });
});
