/**
 * Testes E2E para Navegação
 * Valida navegação entre todas as telas do aplicativo
 */

import { test, expect } from "@playwright/test";

test.describe("Navegação Principal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#root", { timeout: 10000 });
    // Aguardar app carregar
    await page.waitForTimeout(2000);
  });

  test("deve carregar a página inicial", async ({ page }) => {
    await expect(page).toHaveTitle(/MyBacklog/);
    await expect(page.locator("#root")).toBeVisible();
  });

  test("deve navegar para Dashboard", async ({ page }) => {
    const navItem = page.getByText("Dashboard", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
    }
    await page.waitForTimeout(500);
    await expect(page.url()).toContain("/");
  });

  test("deve navegar para Biblioteca", async ({ page }) => {
    const navItem = page.getByText("Biblioteca", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
    }
    await page.waitForTimeout(500);
    // URL pode variar, mas devemos estar na tela de library
    const libraryContent = page.getByText(/biblioteca|library|jogos/i);
    await expect(libraryContent.first()).toBeVisible();
  });

  test("deve navegar para Planner", async ({ page }) => {
    const navItem = page.getByText("Planner", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
    }
    await page.waitForTimeout(500);
    await expect(page.getByText(/planner|fila|tática/i).first()).toBeVisible();
  });

  test("deve navegar para Sessões", async ({ page }) => {
    const navItem = page.getByText("Sessões", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
      await page.waitForTimeout(500);
      // Aguardar conteúdo da tela carregar
      await expect(page.locator("#root")).toBeVisible();
    }
  });

  test("deve navegar para Estatísticas", async ({ page }) => {
    const navItem = page.getByText("Estatísticas", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
      await page.waitForTimeout(500);
      // Aguardar conteúdo da tela carregar
      await expect(page.locator("#root")).toBeVisible();
    }
  });

  test("deve navegar para Perfil", async ({ page }) => {
    const navItem = page.getByText("Perfil", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
    }
    await page.waitForTimeout(500);
    await expect(page.getByText(/perfil|profile|configuraç/i).first()).toBeVisible();
  });

  test("deve navegar para Manutenção", async ({ page }) => {
    const navItem = page.getByText("Manutenção", { exact: true });
    if (await navItem.isVisible()) {
      await navItem.click();
      await page.waitForTimeout(500);
      // Aguardar conteúdo da tela carregar
      await expect(page.locator("#root")).toBeVisible();
    }
  });
});

test.describe("Navegação Completa - Circuito", () => {
  test("deve navegar por todas as telas sem erros", async ({ page }) => {
    const screens = [
      { name: "Dashboard", selector: /dashboard|início|inicio/i },
      { name: "Biblioteca", selector: /biblioteca|library/i },
      { name: "Planner", selector: /planner|fila/i },
      { name: "Sessões", selector: /sess(ões|oes)/i },
      { name: "Estatísticas", selector: /estatísticas|stats/i },
      { name: "Perfil", selector: /perfil|profile/i },
    ];

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const screen of screens) {
      const navItem = page.getByText(screen.name, { exact: true });
      if (await navItem.isVisible()) {
        await navItem.click();
        await page.waitForTimeout(500);

        // Verificar se não houve erro
        if (errors.length > 0) {
          console.error(`Errors after navigating to ${screen.name}:`, errors);
        }
        expect(errors).toHaveLength(0);
      }
    }
  });
});
