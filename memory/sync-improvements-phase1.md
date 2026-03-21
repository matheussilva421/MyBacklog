---
name: Sync Architecture Improvements - Fase 1 Completa
description: Implementações de melhorias no sync concluídas em 2026-03-21
type: project
---

**Fase 1 - Fortalecer o modelo atual sem reescrever tudo**

Implementado em 2026-03-21:

1. **localRevision como trigger de sync** - Criado syncRevision.ts com getLocalRevision/incrementLocalRevision. A cada mutação relevante, a revisão é incrementada e o sync é disparado.

2. **deviceId persistente** - Criado deviceId.ts que gera um ID único por instalação no formato device-{timestamp}-{random} e persiste em settings.

3. **Lock entre abas com Web Locks API** - Criado tabSyncLock.ts que usa navigator.locks.request para coordenar sync entre múltiplas abas. Apenas uma aba executa sync por vez. Fallback para lock em memória se não suportado.

4. **Debounce de 5s para auto-sync** - Criado debounce.ts e integrado em useCloudSync.ts/useAppShellSync.ts. Agrupa mudanças rápidas em uma única operação de sync, reduzindo escrita desnecessária.

**Por que:** O sync atual era baseado em snapshot inteiro em users/{uid}, com trigger caro (JSON.stringify gigante) e sem coordenação entre abas.

**Como aplicar:** Estas melhorias tornam o sync mais eficiente e confiável. A Fase 2 (uuid, deletedAt, version) e Fase 3 (sync incremental) podem ser implementadas posteriormente.
