---
name: Sync Engine with Exponential Backoff
description: Implementação de retry com backoff exponencial no sync engine para mutações pendentes
type: project
---

**Implementado em:** 2026-03-21

**O que foi feito:**
- Adicionado retry com backoff exponencial no `src/lib/syncEngine.ts`
- Fórmula: `delay = min(1000ms * 2^retryCount, 300000ms)` (máximo de 5 minutos)
- Limite máximo de 5 retries por mutação (`MAX_RETRY_COUNT = 5`)
- Mutações que excedem o limite são marcadas como "falha permanente" e ignoradas
- Intervalo de polling de 30 segundos em `useCloudSync.ts` para processar fila pendente

**Arquivos modificados:**
- `src/lib/syncEngine.ts` - Adicionado `calculateBackoffDelay()`, `sleep()`, e lógica de retry
- `src/lib/mutationQueue.ts` - Adicionada constante `MAX_RETRY_COUNT = 5`
- `src/hooks/useCloudSync.ts` - Adicionado useEffect com intervalo de 30s para polling da fila
- `src/lib/syncEngine.ts` - `processMutationQueue()` agora retorna `permanentFailures` no resultado

**Comportamento:**
1. Quando uma mutação falha, `retryCount` é incrementado
2. Na próxima tentativa, delay exponencial é aplicado antes de processar
3. Após 5 falhas, a mutação é considerada permanente e não é mais processada
4. polling verifica a fila a cada 30s quando há usuário autenticado e online

**Fórmula do backoff:**
- Retry 1: 2 segundos
- Retry 2: 4 segundos
- Retry 3: 8 segundos
- Retry 4: 16 segundos
- Retry 5: 32 segundos
- Máximo: 300 segundos (5 minutos)

**Próximos passos:**
- Implementar UI na Central de Sync para mostrar mutações com falha permanente
- Adicionar opção para retry manual ou cancelamento de mutações travadas

---

## Fase 4 - UI para Falhas Permanentes (COMPLETA EM 2026-03-21)

**Arquivos criados:**
- `src/modules/sync-center/hooks/usePendingMutationsState.ts` - Hook para gerenciar estado das mutações
- `src/modules/sync-center/hooks/usePendingMutationsState.test.ts` - Testes do hook
- `src/modules/sync-center/components/PendingMutationsPanel.tsx` - Componente de UI
- `src/modules/sync-center/components/PendingMutationsPanel.test.tsx` - Testes do componente
- `src/lib/syncTelemetry.ts` - Telemetria de falhas de sync
- `src/lib/syncTelemetry.test.ts` - Testes da telemetria

**Arquivos modificados:**
- `src/lib/mutationQueue.ts` - Funções utilitárias para gerenciar mutações (retry, delete)
- `src/lib/syncEngine.ts` - Integração com telemetria (logSyncFailure, resolveSyncFailure)
- `src/modules/sync-center/components/SyncCenterScreen.tsx` - Integração do PendingMutationsPanel
- `src/components/AppShellScreenContent.tsx` - Props para onSyncNow
- `src/components/AppShell.tsx` - Exposição de triggerSyncToCloud
- `src/index.css` - Estilos para componentes de mutações

**Funcionalidades implementadas:**
1. **PendingMutationsPanel**: Componente na Central de Sync que mostra:
   - Falhas permanentes (retryCount >= 5) com ações de retry/descarte
   - Falhas temporárias (0 < retryCount < 5) em retry automático
   - Mutações pendentes sem falha (retryCount = 0) agendadas para sync
2. **Ações em batch**: Retry todas, descartar todas, descartar pendentes
3. **Confirmação modal**: Para ações destrutivas em batch
4. **Telemetria**: Log de falhas com resolução automática/manual

**Comportamento:**
- Falhas permanentes exigem intervenção manual (retry ou descarte)
- Ações de retry resetam contador para 0 e reagemendam sync
- Telemetria mantém histórico de 100 últimas falhas para análise
