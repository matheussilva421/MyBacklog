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
