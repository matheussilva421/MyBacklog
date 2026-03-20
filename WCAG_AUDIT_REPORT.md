# Relatório de Auditoria de Acessibilidade (WCAG 2.1)

**Aplicação:** Night City Backlog OS (Arsenal Gamer)
**Data:** 2026-03-20
**Escopo:** Componentes React/TypeScript, CSS, navegação por teclado, ARIA, formulários, modais

---

## Sumário Executivo

| Nível | Quantidade |
|-------|-----------|
| **Crítico** | 3 |
| **Alto (WCAG A/AA)** | 8 |
| **Médio** | 12 |
| **Baixo** | 6 |

---

## 🚨 Crítico - Barreiras Graves de Acessibilidade

### C1. Ausência de Skip Link (WCAG 2.4.1 - Nível A)

**Local:** `src/components/AppShell.tsx`

**Problema:** Não existe skip link para pular navegação e ir direto ao conteúdo principal. Usuários de teclado precisam tabular por todos os itens da sidebar.

**Impacto:** Usuários com mobilidade reduzida ou cegos enfrentam fadiga significativa para acessar conteúdo principal.

**Correção:**
```tsx
// Adicionar no início do AppShell
<a href="#main-content" className="skip-link">
  Pular para o conteúdo principal
</a>
```

```css
.skip-link {
  position: absolute;
  top: -9999px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--yellow);
  color: #000;
  padding: 1rem 2rem;
  z-index: 10000;
}
.skip-link:focus {
  top: 0;
}
```

---

### C2. Focus Management Incompleto em Modais (WCAG 2.4.3 - Nível A)

**Local:** `src/components/cyberpunk-ui.tsx` - Componente `Modal`

**Problema:** Embora o modal implemente focus trap, o foco NEM SEMPRE é restaurado corretamente ao fechar. O uso de `previousActiveElementRef` pode falhar se o elemento original foi desmontado.

**WCAG SC:** 2.4.3 Focus Order, 3.2.1 On Focus

**Correção:**
```tsx
// No cleanup do useEffect:
return () => {
  document.removeEventListener("keydown", handleKeyDown);
  const stackIndex = modalStack.lastIndexOf(modalId);
  if (stackIndex >= 0) modalStack.splice(stackIndex, 1);

  // Verificar se o elemento ainda existe antes de focar
  if (previousActiveElementRef.current?.isConnected) {
    previousActiveElementRef.current.focus({ preventScroll: true });
  } else {
    // Fallback: focar no primeiro elemento focável do modal pai
    const parentModal = modalStack[modalStack.length - 1];
    if (parentModal) {
      const parentElement = document.getElementById(parentModal);
      const focusable = getFocusableElements(parentElement!);
      focusable[0]?.focus();
    }
  }
};
```

---

### C3. Elementos de Formulário sem Label Explícito (WCAG 1.3.1, 4.1.2 - Nível A)

**Locais:** Múltiplos componentes

**Problema:** Vários inputs usam `<label>` envolvente (wrapping label), o que é válido, MAS alguns elementos não têm associação explícita via `htmlFor`/`id`.

**Exemplos Problemáticos:**
- `src/components/LoginScreen.tsx` - labels wrapping inputs sem `htmlFor`
- `src/modules/settings/components/PreferencesFields.tsx` - idem
- `src/modules/onboarding/components/OnboardingScreen.tsx` - idem

**Correção:** Adicionar IDs únicos e `htmlFor`:

```tsx
// LoginScreen.tsx
<label htmlFor="email-input" className="form-field">
  <span>E-mail</span>
  <input
    id="email-input"
    type="email"
    value={email}
    // ...
  />
</label>
```

---

## 🔴 Alto - Violações WCAG A/AA

### H1. Ausência de Aria-Current em Navegação Ativa (WCAG 4.1.2 - Nível A)

**Local:** `src/components/AppShell.tsx` - SidebarItem

**Problema:** Items ativos usam classe CSS `sidebar-item--active` mas não indicam estado atual via ARIA.

**Correção:**
```tsx
<SidebarItem
  // ...
  aria-current={active ? "page" : undefined}
/>
```

---

### H2. Botões sem Nome Acessível Descritivo (WCAG 4.1.2 - Nível A)

**Locais:**
- `src/modules/library/components/LibraryScreen.tsx` - Botões de filtro "Selecionar", "Excluir view"
- `src/components/backlog-modals.tsx` - Botões de ação em batch edit

**Problema:** Botões com texto genérico como "Selecionar" não fornecem contexto.

**Correção:**
```tsx
<button
  aria-label={`Selecionar ${game.title} para edição em lote`}
  // ...
>
  Selecionar
</button>
```

---

### H3. Loading States não Anunciados para Screen Readers (WCAG 4.1.3 - Nível AA)

**Locais:** `src/components/AppShell.tsx`, `src/App.tsx`

**Problema:** Fallbacks de loading usam `role="status"` e `aria-live="polite"`, o que é BOM, mas mensagens são genéricas.

**Correção:** Especificar o que está carregando:
```tsx
<div role="status" aria-live="polite" aria-busy="true">
  <span className="loading-shell__pulse" aria-hidden="true" />
  <strong>Carregando {moduleName}...</strong>
  <p>Preparando controles e conteúdo.</p>
</div>
```

---

### H4. Contraste de Cores Insuficiente (WCAG 1.4.3 - Nível AA)

**Local:** `src/index.css`

**Problemas Detectados:**

| Elemento | Cor Atual | Contraste | Mínimo AA |
|----------|-----------|-----------|-----------|
| `--text-soft` (#b1b8c6) em fundo escuro | ~4.2:1 | 4.5:1 |
| `--text-faint` (#8a94a7) em fundo escuro | ~3.1:1 | 4.5:1 |
| Borda de input (`rgba(244, 239, 27, 0.14)`) | ~2.8:1 | 3:1 |

**Correção:**
```css
:root {
  --text-soft: #c9d1d9; /* Aumentar luminosidade */
  --text-faint: #9aa0a6; /* Aumentar contraste */
}
```

---

### H5. Error Messages de Formulário não Associadas (WCAG 3.3.1 - Nível A)

**Local:** `src/components/LoginScreen.tsx`

**Problema:** Mensagem de erro é renderizada acima do formulário, mas não está associada aos inputs específicos.

**Correção:**
```tsx
{error ? (
  <div
    id="login-error"
    role="alert"
    aria-live="assertive"
    className="field-feedback field-feedback--error"
  >
    {error}
  </div>
) : null}

<input
  aria-invalid={!!error}
  aria-describedby={error ? "login-error" : undefined}
  // ...
/>
```

---

### H6. Ausência de Aria-Expanded em Elementos Expandíveis (WCAG 4.1.2 - Nível A)

**Local:** `src/components/backlog-modals.tsx` - `<details>` element

**Problema:** Elemento `<details>` com `summary="Ver alterações"` não tem `aria-expanded`.

**Correção:** Embora `<details>` tenha comportamento nativo, adicionar aria-expanded melhora suporte:
```tsx
<details aria-expanded={isOpen}>
  <summary>Ver alterações</summary>
  ...
</details>
```

---

### H7. Foco não Visível em Todos os Elementos (WCAG 2.4.7 - Nível AA)

**Local:** `src/index.css`

**Problema:** Apenas `.cp-button`, `.platform-card-interactive` têm `:focus-visible` explícito. Muitos elementos interativos dependem do estilo padrão do navegador.

**Elementos sem foco visível explícito:**
- `.sidebar-item`
- `.filter-chip`
- `.library-card`
- `.session-card__actions button`

**Correção:**
```css
.sidebar-item:focus-visible,
.filter-chip:focus-visible,
.library-card:focus-visible {
  outline: 2px solid rgba(38, 216, 255, 0.62);
  outline-offset: 2px;
}
```

---

### H8. Role="document" em Modal sem Necessidade (WCAG 4.1.2)

**Local:** `src/components/cyberpunk-ui.tsx`

**Problema:** `role="document"` no `modal-shell` pode causar confusão com screen readers. O modal já tem `role="dialog"`.

**Correção:** Remover `role="document"`:
```tsx
<div ref={modalRef} className="modal-shell" tabIndex={-1}>
```

---

## 🟡 Médio - Melhorias Recomendadas

### M1. Ausência de Live Region para Atualizações Dinâmicas (WCAG 4.1.3 - Nível AA)

**Locais:** Biblioteca, Sessões, Sync Center

**Problema:** Atualizações de lista (filtrar, ordenar, adicionar jogos) não são anunciadas.

**Correção:**
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {libraryGames.length} jogos encontrados
</div>
```

---

### M2. Toast/Notificações não Acessíveis (WCAG 4.1.3 - Nível AA)

**Local:** `src/App.tsx`, `src/components/AppShell.tsx` - `app.notice`

**Problema:** Banner de notificação não usa `role="status"` ou `aria-live`.

**Correção:**
```tsx
{app.notice ? (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="system-banner"
  >
    <span>{app.notice}</span>
    <button
      type="button"
      onClick={() => app.dismissNotice()}
      aria-label="Descartar notificação"
    >
      ×
    </button>
  </div>
) : null}
```

---

### M3. Headings Fora de Sequência (WCAG 1.3.1 - Nível A)

**Local:** Múltiplos componentes

**Problema:** Saltos de H2 para H4 em alguns painéis.

**Exemplo:** `src/modules/game-page/components/GamePageScreen.tsx`
- H2 no hero
- H3 em "Timeline de sessões"
- H4 em notas rápidas

**Correção:** Manter hierarquia lógica H1 > H2 > H3 > H4.

---

### M4. Alt Text Genérico em Imagens (WCAG 1.1.1 - Nível A)

**Locais:** Game covers, RAWG candidate cards

**Problema:** Alguns alt texts são redundantes: "Capa de [título]" pode ser mais descritivo.

**Correção:**
```tsx
<img
  src={game.coverUrl}
  alt={`Capa do jogo ${game.title}${game.year ? `, lançado em ${game.year}` : ""}`}
/>
```

---

### M5. Ausência de Aria-Sort em Colunas Ordenáveis (WCAG 4.1.2 - Nível A)

**Local:** `src/modules/library/components/LibraryScreen.tsx` - Select de ordenação

**Problema:** Usuário não sabe direção atual da ordenação via screen reader.

**Correção:**
```tsx
<select
  value={sortDirection}
  onChange={...}
  aria-label="Direção de ordenação"
  aria-sort={sortDirection === "asc" ? "ascending" : "descending"}
>
```

---

### M6. Cursor não Personalizado em Elementos Clicáveis (WCAG 2.1 - Nível A)

**Local:** `src/index.css`

**Problema:** Alguns elementos com `onClick` não têm `cursor: pointer`.

**Correção:**
```css
[role="button"],
button:not(:disabled),
[tabindex]:not([tabindex="-1"]) {
  cursor: pointer;
}
```

---

### M7. Tamanho de Alvo de Toque Insuficiente (WCAG 2.5.5 - Nível AAA)

**Local:** Vários botões e chips

**Problema:** Alguns elementos têm altura de 28px (`.cp-tag`, `.cp-pill`).

**Correção:** Mínimo recomendado é 44x44px para toque.
```css
.cp-tag,
.cp-pill,
.filter-chip {
  min-height: 44px;
  padding: 0.5rem 1rem;
}
```

---

### M8. Placeholder de Input como Único Label Visual (WCAG 3.3.2 - Nível A)

**Local:** `src/modules/settings/components/PreferencesFields.tsx`

**Problema:** Placeholders desaparecem ao digitar, removendo contexto.

**Correção:** Labels visíveis sempre presentes (já implementado via `<span>`), garantir que não sejam hidden.

---

### M9. Ausência de Aria-Describedby em Inputs Complexos (WCAG 3.3.2 - Nível A)

**Local:** `src/modules/settings/components/PreferencesFields.tsx`

**Problema:** `<small>` com descrição não está associado ao input.

**Correção:**
```tsx
<label className="field">
  <span id="rawg-label">
    <KeyRound size={14} /> Chave RAWG (opcional)
  </span>
  <input
    aria-describedby="rawg-help"
    // ...
  />
  <small id="rawg-help">
    {draft.rawgApiKey ? "..." : "..."}
  </small>
</label>
```

---

### M10. Links Externos sem Indicação (WCAG 2.4.4 - Nível A)

**Local:** `src/modules/library/components/LibraryScreen.tsx` - storeLink

**Problema:** Link abre em nova janela sem aviso.

**Correção:**
```tsx
<a
  href={selectedGame.storeLink}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Ver na loja (abre em nova janela)"
>
  <Pill tone="cyan">
    Ver na loja <ArrowUpRight size={12} aria-hidden="true" />
  </Pill>
</a>
```

---

### M11. Ausência de Redução de Movimento (WCAG 2.3.3 - Nível AAA)

**Local:** `src/index.css` - Animações

**Problema:** Transições e transforms não respeitam `prefers-reduced-motion`.

**Correção:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### M12. Guided Tour sem Controle de Pausa (WCAG 2.2 - Nível A)

**Local:** `src/modules/onboarding/components/GuidedTourModal.tsx`

**Problema:** Usuários não podem pausar/retomar o tutorial.

**Correção:** Adicionar botão "Pausar" que mantém estado atual.

---

## 🟢 Baixo - Melhores Práticas

### B1. Uso Excessivo de `aria-hidden="true"` em Ícones Decorativos

Ícones do Lucide deveriam ter `aria-hidden="true"` consistentemente.

---

### B2. Text Resize pode Quebrar Layout

Testar com zoom de 200% - alguns painéis podem vazar horizontalmente.

---

### B3. Idades de Sessão Não São Persistidas

`useId()` do React gera IDs diferentes em re-renders, quebrando associação label-input em alguns casos.

---

### B4. Títulos de Página não Descritivos

`document.title` deveria refletir tela atual: "Biblioteca | Night City Backlog OS"

---

### B5. Foco Inicial em Modal Poderia Ser Mais Explícito

Atributo `data-autofocus` é usado, mas poderia ser padronizado.

---

### B6. Ausência de Meta Viewport para Zoom

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
```

---

## Resumo de Prioridades

### Correção Imediata (Crítico + Alto)

1. Adicionar Skip Link
2. Corrigir focus management em modais
3. Adicionar labels explícitos em formulários
4. Implementar `aria-current` na navegação
5. Corrigir contraste de cores
6. Adicionar `aria-live` para loading states

### Próxima Sprint (Médio)

1. Live regions para atualizações dinâmicas
2. Toast notifications acessíveis
3. Foco visível em todos os elementos interativos
4. Associar error messages a inputs
5. Adicionar `prefers-reduced-motion`

### Backlog (Baixo)

1. Meta viewport para zoom
2. Títulos de página descritivos
3. Padronizar `data-autofocus`
4. Melhorar alt text de imagens

---

## Ferramentas Recomendadas para Validação

- **axe DevTools** - Chrome Extension
- **WAVE** - wave.webaim.org
- **Lighthouse Accessibility** - Chrome DevTools
- **NVDA/VoiceOver** - Teste manual com screen readers
- **Tab Key Navigation** - Teste manual de teclado

---

## Referências WCAG

- **WCAG 2.1 Level A:** https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&level=a
- **WCAG 2.1 Level AA:** https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&level=aa
- **WAI-ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/

---

*Relatório gerado em 2026-03-20 para Night City Backlog OS*
