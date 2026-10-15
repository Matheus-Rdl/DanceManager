# Financeiro Geral — período compartilhado entre as quatro abas

## Instalação

Substitua **apenas** este arquivo:

`frontend/src/features/financial/general/FinancialGeneral.jsx`

Use junto da versão do projeto com quatro abas e do `FinancialPeriodSelector.jsx` mais recente (com indicador de período ativo).

Não é necessário alterar backend, serviços, `financialPeriod.js` ou `FinancialPeriodSelector.jsx`.

## O que mudou

Antes: havia um estado de período distinto para Visão Geral, Recebimentos, Despesas e Evolução Financeira.

Agora: `FinancialGeneral` mantém uma única seleção `period`, compartilhada pelos quatro componentes. O usuário escolhe o período uma vez, e a seleção permanece ao navegar entre abas.

O filtro funciona nos modos 6 meses, 12 meses, ano e mês; as setas, o seletor de mês/ano e a indicação do intervalo continuam funcionando sem alterações.

## Teste rápido

1. Em Visão Geral, escolha 12 meses até agosto de 2026.
2. Entre em Recebimentos, Despesas e Evolução: todas devem mostrar o mesmo intervalo.
3. Em Despesas, mude para fevereiro de 2026 e modo Mês.
4. Retorne a Visão Geral: o filtro deve permanecer em fevereiro de 2026.

## Observação

A implementação preserva o período enquanto o componente estiver montado. Ao atualizar a página, volta para o mês atual, como já ocorria anteriormente. Persistência após recarga pode ser acrescentada separadamente.
