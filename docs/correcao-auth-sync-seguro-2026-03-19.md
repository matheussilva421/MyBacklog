# Correcao de Auth, Sync Seguro e Regressao de Testes

Data: 2026-03-19

## Contexto

As ultimas modificacoes introduziram tres regressoes principais:

1. o app passou a exigir login sempre, mesmo quando o Firebase nao estivesse configurado;
2. a sincronizacao com a nuvem comparava payloads incluindo `exportedAt`, o que forçava pushes redundantes;
3. o pull da nuvem substituia a base local inteira sem checagem de conflito, com risco real de perda de dados.

Tambem houve regressao objetiva na suite de testes: `src/App.test.tsx` passou a falhar porque o `App` agora rendia `LoginScreen` em vez do shell principal.

## O que foi corrigido

### 1. Fallback local quando o Firebase nao estiver configurado

Arquivo principal:

- `src/lib/firebase.ts`
- `src/contexts/AuthContext.tsx`
- `src/App.tsx`

Mudancas:

- foi criado `isFirebaseConfigured`, que verifica se todas as variaveis `VITE_FIREBASE_*` estao preenchidas;
- o Firebase agora so e inicializado quando a configuracao existe de fato;
- `AuthContext` passou a expor `isAuthEnabled`;
- quando `isAuthEnabled === false`, o app nao bloqueia mais em `LoginScreen` e continua operando em modo local com IndexedDB;
- o botao `Desconectar` so aparece quando existe autenticacao em nuvem ativa.

Efeito pratico:

- ambientes locais, previews ou deploys sem credenciais deixam de travar;
- o comportamento antigo de uso local continua disponivel.

### 2. Sincronizacao segura e sem pushes redundantes

Arquivo principal:

- `src/hooks/useCloudSync.ts`

Mudancas:

- foi criado `buildSyncFingerprint`, que monta um fingerprint a partir das tabelas reais, ignorando `exportedAt`;
- foi criado `resolveInitialSyncDecision`, com cinco cenarios:
  - `idle`
  - `pull-cloud`
  - `push-local`
  - `match`
  - `conflict`
- o app agora decide o bootstrap de sync assim:
  - nuvem vazia + local com dados: envia local;
  - local vazio + nuvem com dados: baixa nuvem;
  - ambos iguais: nao faz overwrite;
  - ambos diferentes: detecta conflito e pausa a sincronizacao automatica naquela sessao.

Efeito pratico:

- o app para de enviar backup completo a cada render relevante;
- dados locais deixam de ser sobrescritos automaticamente por um snapshot remoto divergente;
- a sincronizacao so prossegue automaticamente quando o estado e seguro.

### 3. Pull remoto deixou de apagar tabela que nao faz parte do backup sincronizado

Arquivo principal:

- `src/hooks/useCloudSync.ts`

Mudanca:

- `importJobs` deixou de ser limpo durante o pull remoto, porque essa tabela nao faz parte do payload de backup sincronizado.

Efeito pratico:

- evita perda silenciosa de dados/transientes locais que nao pertencem ao contrato atual de sync.

### 4. Testes corrigidos e reforcados

Arquivos:

- `src/App.test.tsx`
- `src/hooks/useCloudSync.test.ts`

Mudancas:

- `App.test.tsx` passou a mockar `useAuth` e `useCloudSync`, isolando os testes do shell principal;
- foi adicionado teste para o caso de auth em nuvem ativa sem usuario autenticado;
- foi criada cobertura para:
  - fingerprint ignorando `exportedAt`;
  - bootstrap `pull-cloud`;
  - bootstrap `push-local`;
  - conflito entre local e nuvem.

## Validacao executada

### Build

Comando:

```powershell
npm run build
```

Resultado:

- build concluido com sucesso.
- aviso residual existente: chunk JS principal acima de 500 kB.

### Testes

Comando:

```powershell
npm run test:run
```

Resultado:

- 17 arquivos de teste aprovados
- 76 testes aprovados

### Checagem no navegador

Foi aberto o preview local para garantir que:

- o app responde normalmente em runtime;
- com auth configurada, a tela de login continua aparecendo corretamente;
- nao surgiram erros de console durante a abertura.

Observacao:

- neste ambiente de validacao havia configuracao de auth disponivel, por isso a interface abriu em `LoginScreen`;
- o fallback sem Firebase configurado ficou validado pela nova logica central e pelos testes automatizados.

## Risco que foi removido

O risco mais grave removido foi este:

- um usuario com base local valida podia autenticar, receber um snapshot remoto divergente e ter a base local sobrescrita sem confirmacao.

Depois da correcao:

- divergencia gera conflito controlado;
- os dados locais sao mantidos;
- a sincronizacao automatica fica pausada naquela sessao em vez de destruir dados.

## Proximo passo recomendado

Se voce quiser evoluir essa parte com mais seguranca, o proximo passo ideal e:

- criar uma UI de resolucao de conflito entre base local e nuvem;
- mostrar comparacao entre snapshot local e remoto;
- permitir escolher conscientemente entre:
  - manter local
  - puxar nuvem
  - mesclar
  - publicar local na nuvem
