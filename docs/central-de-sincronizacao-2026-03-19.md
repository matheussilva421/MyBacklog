# Central de Sincronização

Data: 2026-03-19

## Objetivo

Esta entrega transformou a sincronização em uma parte visível e controlável do produto.

O pacote fechado nesta fase inclui:

- tela dedicada de sync
- comparação local x nuvem por blocos
- ações manuais de envio, pull, merge e modo local
- banner de confiança no shell
- opção de auto-sync nas configurações
- code splitting real para reduzir o peso do bundle inicial

## Principais mudanças

### Tela de Sync

Foi criada a tela:

- `src/modules/sync-center/components/SyncCenterScreen.tsx`

Ela mostra:

- status atual da sync
- conectividade
- auto-sync ativo ou pausado
- último sync bem-sucedido
- timestamp do snapshot remoto
- comparação por blocos
- histórico curto de operações

### Resolução de conflito

A lógica foi consolidada em:

- `src/modules/sync-center/utils/syncEngine.ts`
- `src/modules/sync-center/utils/syncStorage.ts`
- `src/hooks/useCloudSync.ts`

O fluxo agora consegue:

- identificar divergência entre base local e nuvem
- separar diferença por blocos
- preservar histórico no merge
- ignorar metadados locais de operação da sync ao calcular fingerprint

### UX de confiança

O shell passou a ter um banner específico de sync em:

- `src/components/AppShell.tsx`
- `src/index.css`

Esse banner informa:

- modo atual
- descrição curta do estado
- auto-sync ativo ou não
- atalho para a Central de Sync

As preferências ganharam o toggle de auto-sync em:

- `src/modules/settings/components/PreferencesFields.tsx`
- `src/modules/settings/utils/preferences.ts`

## Refatoração técnica

### Shell lazy

O `src/App.tsx` foi reduzido para gate leve de autenticação.

O shell principal foi movido para:

- `src/components/AppShell.tsx`

Esse shell agora é carregado via `React.lazy`, diminuindo o peso do chunk principal.

### Split de Firebase

O build foi ajustado em:

- `vite.config.ts`

Agora os chunks foram separados em:

- `firebase-core`
- `firebase-auth`
- `firebase-firestore`

## Resultado no build

Depois da refatoração:

- o chunk principal caiu para cerca de `13.7 kB`
- `AppShell` ficou em cerca de `154 kB`
- `firebase-auth` ficou em cerca de `166 kB`
- `firebase-firestore` ficou em cerca de `383 kB`

Resultado final:

- o warning de chunk acima de `500 kB` foi eliminado

## Testes executados

### Testes automatizados

Comando:

```bash
npm run test:run
```

Resultado:

- `19` arquivos de teste
- `82` testes passando

Arquivos importantes de teste desta fase:

- `src/App.test.tsx`
- `src/components/AppShell.test.tsx`
- `src/modules/sync-center/components/SyncCenterScreen.test.tsx`
- `src/hooks/useCloudSync.test.ts`

### Build

Comando:

```bash
npm run build
```

Resultado:

- build de produção passando
- sem warning de chunk grande

### Validação visual

Foi feito preview real no navegador.

No ambiente atual, o projeto abriu a tela de login corretamente quando a autenticação em nuvem está ativa. A interface nova da Central de Sync foi validada estruturalmente pelos testes de componente e pelo shell integrado.

## Arquivos principais alterados

- `src/App.tsx`
- `src/components/AppShell.tsx`
- `src/components/AppShell.test.tsx`
- `src/components/LoginScreen.tsx`
- `src/modules/sync-center/components/SyncCenterScreen.tsx`
- `src/modules/sync-center/components/SyncCenterScreen.test.tsx`
- `src/hooks/useCloudSync.ts`
- `src/modules/settings/components/PreferencesFields.tsx`
- `src/modules/settings/components/ProfileScreen.tsx`
- `vite.config.ts`
- `src/index.css`

## Estado final

Depois desta etapa, o app passou a ter:

- Central de Sincronização funcional
- UX clara de confiança para modo local, nuvem, conflito e offline
- auto-sync configurável
- histórico curto de operações
- comparação local x nuvem por blocos
- merge manual
- bundle inicial mais leve
