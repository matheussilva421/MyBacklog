# Relatório de Alterações - 20/03/2024

**Objetivo:** Implementar importador nativo do Notion e enriquecer o modelo de dados com campos financeiros e de início de jogo.

## Alterações de Código

### Modelo de Dados (`src/core/types.ts`)

- Adicionado `startedAt?: string` ao `LibraryEntry`.
- Adicionado suporte a campos de compra: `pricePaid`, `targetPrice`, `currency`, `purchaseDate`, `storeLink`.

### Importação (`src/modules/import-export/utils/importExport.ts`)

- Novo parser `parseNotionCsv` adicionado.
- Mapeamento inteligente de colunas CSV do Notion para o Payload de Importação.

### Log de Importação (`src/hooks/useBacklogActions.ts`)

- Refinamento do `ImportJob` para incluir `changes` (lista de itens afetados) e `status`.
- Persistência detalhada de erros e sucessos no banco de dados.

### Interface do Usuário (`src/components/backlog-modals.tsx`)

- **GameModal:** Nova seção "Datas e Aquisição" com inputs para todos os novos campos.
- **ImportModal:** Adicionada aba de "Histórico" para consulta rápida de logs de importação.
- **ImportPreview:** Novo Pill "Financeiro" para indicar jogos que trazem dados de compra.

## Retorno e Retrocompatibilidade

- Todos os campos novos são opcionais (`undefined` por padrão).
- O banco de dados foi atualizado via Dexie sem perda de dados existentes.
- O importador genérico de CSV continua funcionando normalmente.

---

_Assinado por Antigravity (IA)_
