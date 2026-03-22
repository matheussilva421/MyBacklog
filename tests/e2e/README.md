# Mock Data & E2E Tests - MyBacklog

Este documento descreve como usar o sistema de mock data e testes E2E do MyBacklog.

## Visão Geral

O projeto agora inclui:

1. **Gerador de Mock Data** (`src/core/mockDataGenerator.ts`) - Gera ~30 jogos com dados realistas
2. **Seeder** (`src/core/mockDataSeeder.ts`) - Popula o IndexedDB via browser
3. **Página de Seed** (`src/pages/SeedPage.tsx`) - UI para seed manual em dev
4. **Testes E2E** (`tests/e2e/`) - Suite de testes Playwright

## Instalação

Os seguintes pacotes foram adicionados:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Comandos Disponíveis

```bash
# Seed de dados mock via CLI (requer servidor rodando)
npm run seed:mock

# Seed com limpeza prévia
npm run seed:mock -- --clean

# Rodar testes E2E
npm run test:e2e

# Rodar testes com UI do Playwright
npm run test:e2e:ui

# Rodar testes em modo debug
npm run test:e2e:debug
```

## Uso em Desenvolvimento

### Seed via Página UI

1. Inicie o servidor de dev: `npm run dev`
2. Navegue para `/seed` (adicione esta rota no App.tsx se necessário)
3. Clique em "Seed Database"
4. Os dados serão populados no IndexedDB

### Seed via Testes

Os testes E2E automaticamente seedam os dados antes de executar.

## Estrutura de Dados Mock

O gerador cria:

| Tabela | Quantidade | Descrição |
|--------|------------|-----------|
| `games` | 30 | Jogos reais (Cyberpunk, Hades, Witcher 3, etc.) |
| `libraryEntries` | 30 | Uma entry por jogo com status variados |
| `playSessions` | ~80 | Sessões distribuídas nos últimos 6 meses |
| `stores` | 9 | Steam, Epic, GOG, etc. |
| `platforms` | 7 | PC, PS5, Xbox, Switch, etc. |
| `tags` | 20 | RPG, Indie, Souls-like, etc. |
| `lists` | 5 | Favorites, 2026 Goal, etc. |
| `reviews` | ~10 | Reviews para jogos completados |
| `goals` | 4 | Metas de playtime, jogos completados, etc. |
| `savedViews` | 3 | Views salvas de library |

## Testes E2E

### Arquivos de Teste

- `tests/e2e/fixtures.ts` - Fixtures compartilhadas
- `tests/e2e/navigation.test.ts` - Navegação entre telas
- `tests/e2e/dashboard.test.ts` - Dashboard (cards, charts, badges)
- `tests/e2e/library.test.ts` - Biblioteca (filtros, search, sort)
- `tests/e2e/planner.test.ts` - Planner (fila tática, goals)
- `tests/e2e/sessions.test.ts` - Sessões (timer, filtros)
- `tests/e2e/game-page.test.ts` - Página do jogo (detalhes, tags, review)

### Executando Testes

```bash
# Todos os testes
npm run test:e2e

# Testes específicos
npx playwright test navigation
npx playwright test dashboard
npx playwright test library

# Com UI interativa
npm run test:e2e:ui
```

### CI/CD

O GitHub Action (`.github/workflows/e2e-tests.yml`) roda os testes em:
- Push para `main`
- Pull requests

Os artifacts (relatórios, screenshots) são salvos por 30 dias.

## Adicionando a Página de Seed

Para usar a página de seed UI, adicione a rota no `App.tsx`:

```tsx
// Em desenvolvimento, adicionar rota /seed
{import.meta.env.DEV && (
  <Route path="/seed" element={<SeedPage />} />
)}
```

## Próximos Passos

1. **Expandir dados mock**: Adicionar mais jogos, sessões, tags
2. **Testes visuais**: Adicionar screenshot comparisons
3. **Seed programático**: Endpoint API para seed em testes
4. **Multi-browser**: Adicionar Firefox e WebKit aos testes

## Troubleshooting

### "Cannot find module" nos testes

Certifique-se de que o Playwright está instalado:
```bash
npx playwright install
```

### Seed não funciona no CLI

O script CLI requer que o servidor de dev esteja rodando:
```bash
npm run dev
# Em outro terminal:
npm run seed:mock
```

### Testes falhando no CI

Verifique:
1. O build está correto: `npm run build`
2. O servidor inicia corretamente
3. Não há erros de console no app

## Referências

- [Playwright Docs](https://playwright.dev)
- [Playwright Test](https://playwright.dev/docs/test-intro)
- [GitHub Actions](https://docs.github.com/en/actions)
