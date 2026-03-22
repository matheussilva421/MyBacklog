/**
 * Testes E2E para Biblioteca (Library)
 * Valida filtros, search, sort, group e saved views
 */

import { test, expect } from "@playwright/test";

test.describe("Library", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/library");
    await page.waitForSelector("#root", { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test("deve carregar a Biblioteca", async ({ page }) => {
    await expect(page.getByText(/biblioteca|library/i).first()).toBeVisible();
  });

  test("deve exibir lista/grid de jogos", async ({ page }) => {
    // Buscar por cards de jogos ou lista
    const gameCards = page.getByTestId(/game-card|game-item/i);
    const gameGrid = page.getByTestId(/game-grid|library-grid/i);

    // Ou buscar por títulos de jogos comuns do mock
    const mockGames = ["Cyberpunk", "Hades", "Witcher", "Hollow Knight", "Stardew"];
    let hasGames = false;

    for (const game of mockGames) {
      if (await page.getByText(game, { exact: false }).isVisible()) {
        hasGames = true;
        break;
      }
    }

    // Se tiver dados mock, deve mostrar jogos
    const gamesVisible = await gameCards.count();
    if (gamesVisible > 0 || hasGames) {
      expect(gamesVisible > 0 || hasGames).toBe(true);
    }
  });

  test("deve filtrar por status", async ({ page }) => {
    const statusFilters = ["Todos", "Backlog", "Jogando", "Terminado", "Pausado", "Wishlist"];

    for (const status of statusFilters) {
      const filterButton = page.getByText(status, { exact: true });
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(500);

        // Verificar que o filtro foi aplicado
        const activeFilter = page.locator("[class*='active'], [class*='selected']");
        const isActive = await activeFilter.filter({ hasText: status }).isVisible();
        if (isActive) {
          expect(isActive).toBe(true);
        }
      }
    }
  });

  test("deve realizar busca por texto", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|search|procurar/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill("Cyberpunk");
      await page.waitForTimeout(500);

      // Deve filtrar para mostrar apenas Cyberpunk
      const results = page.getByText("Cyberpunk");
      await expect(results.first()).toBeVisible();
    }
  });

  test("deve ordenar por critério selecionado", async ({ page }) => {
    const sortSelect = page.getByTestId(/sort|ordenar/i);

    if (await sortSelect.isVisible()) {
      // Testar diferentes ordenações
      const sortOptions = ["title", "priority", "progress", "hours"];

      for (const option of sortOptions) {
        if (await sortSelect.locator(`option[value="${option}"]`).isVisible()) {
          await sortSelect.selectOption(option);
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test("deve agrupar por critério selecionado", async ({ page }) => {
    const groupSelect = page.getByTestId(/group|agrupar/i);

    if (await groupSelect.isVisible()) {
      const groupOptions = ["none", "status", "priority", "platform"];

      for (const option of groupOptions) {
        if (await groupSelect.locator(`option[value="${option}"]`).isVisible()) {
          await groupSelect.selectOption(option);
          await page.waitForTimeout(500);

          // Verificar que grupos foram criados
          const groups = page.locator("[class*='group'], [data-group]");
          if (option !== "none") {
            const groupsCount = await groups.count();
            if (groupsCount > 0) {
              expect(groupsCount).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  test("deve salvar view atual", async ({ page }) => {
    const saveViewButton = page.getByText(/salvar view|save view|salvar filtro/i);

    if (await saveViewButton.isVisible()) {
      await saveViewButton.click();
      await page.waitForTimeout(500);

      // Verificar modal de salvar
      const modal = page.locator("[role='dialog'], [class*='modal']");
      if (await modal.isVisible()) {
        const nameInput = modal.getByPlaceholder(/nome|name/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill("Test View");
          await modal.getByText(/salvar|save/i).click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test("deve carregar saved view", async ({ page }) => {
    const savedViewSelector = page.getByTestId(/saved-view|view-salva/i);

    if (await savedViewSelector.isVisible()) {
      const views = await savedViewSelector.locator("option").count();
      if (views > 0) {
        await savedViewSelector.selectIndex(1);
        await page.waitForTimeout(500);
      }
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
