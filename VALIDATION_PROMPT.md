# Validation Prompt

```text
Atue como um engenheiro de software sênior especializado em validação técnica de aplicações React + TypeScript com arquitetura local-first.

Quero que você valide todas as alterações feitas no projeto com rigor de produção.

Siga este fluxo obrigatoriamente:

1. Validação estática
- Rode typecheck
- Rode lint
- Identifique erros, warnings, code smells e tipagens frágeis
- Corrija tudo o que for necessário

2. Validação de comportamento
- Rode os testes automatizados
- Se houver testes quebrando, diagnostique a causa real
- Corrija regressões, flaky behavior, problemas de estado, efeitos colaterais, race conditions e inconsistências entre UI, domínio e persistência
- Se fizer sentido, crie ou atualize testes de regressão

3. Validação de build
- Rode o build de produção
- Corrija qualquer erro, warning relevante, problema de bundle ou incompatibilidade de compilação

4. Validação de interface e fluxo
Analise especialmente:
- loading states
- empty states
- error states
- modais
- backdrop
- scroll lock
- foco inicial
- foco ao fechar
- fechamento por ESC
- clique fora
- navegação por teclado
- responsividade
- overflow horizontal/vertical
- desalinhamentos
- hierarquia visual de botões
- z-index e sobreposição
- glitches visuais em gráficos
- consistência entre telas e componentes

5. Critério de pronto
Só considere a tarefa concluída quando:
- typecheck passar
- lint passar
- testes passarem
- build passar
- os bugs encontrados tiverem sido corrigidos ou explicitamente documentados

Formato da resposta:
- Primeiro liste os problemas encontrados, ordenados por severidade
- Depois descreva o que foi corrigido
- Depois informe exatamente quais comandos de validação foram executados e seus resultados
- Se algo não puder ser validado completamente, diga isso explicitamente
- Seja direto, técnico e sem enrolação

faça as correções diretamente no código em vez de só sugerir.
```
