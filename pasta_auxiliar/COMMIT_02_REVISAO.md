# Commit 02 — Modelo de contas financeiras

**Projeto:** DanceManager  
**Base utilizada:** `backend(20261119-202243).zip` e testes do Commit 01.  
**Escopo:** somente novo model, funções puras de validação e testes; não modifica módulos existentes.

## Arquivos incluídos

- `src/models/FinancialAccount.js` — schema de contas financeiras, índices de unicidade por escola e regra de uma conta padrão por escola.
- `src/models/financialAccountRules.js` — validação do valor inicial em BRL e de datas de calendário no padrão `YYYY-MM-DD`.
- `tests/finance/financialAccount.test.mjs` — testes da definição do model e das validações, sem MongoDB.

## Campos e regras

- `id` e `schoolId`: strings, de acordo com os models financeiros existentes.
- `name`/`nameKey`: rótulo e chave normalizada de identificação; a escola não pode ter duas contas com a mesma `nameKey`.
- `type`: `bank`, `payment` ou `cash` (a terceira opção permite uma futura conta Carteira, mas **nenhuma será criada agora**).
- `initialBalance`: número informado manualmente, com duas casas decimais no máximo; pode ser `0` ou negativo (saldo devedor).
- `balanceDate`: data em `YYYY-MM-DD`, entendida como o saldo **ao final daquele dia**. O futuro cálculo dos saldos deverá considerar movimentos **após** essa data; datas de corte e horários exigirão atenção especial na fase de integração.
- `isDefault`/`active`: controle de conta principal e inativação futura.
- `createdAt`/`updatedAt`: datas em texto, como o restante dos models financeiros.
- Não existe `currentBalance`: o saldo corrente será calculado no backend em um commit posterior.

## Execução dos testes

A partir da pasta `backend` (Node.js 22.16+):

```bash
node --test tests/finance/*.test.mjs
```

O teste do model usa um substituto **somente para inspecionar o schema declarado**, porque os ZIPs não incluem `mongoose` nem `package.json`. Isso **não** substitui os testes de integração com Mongoose/MongoDB, que deverão ser realizados ao integrar a API.

## O que não foi implementado

- Nenhuma conta Noh ou InfinitePay foi criada no banco (ficará para o Commit 04).
- Nenhuma API, migração, saldo calculado, transferência, formulário ou filtro foi alterado.
- Nenhum lançamento antigo foi modificado.

## Mensagem de commit

`feat(financeiro): criar modelo de contas financeiras com validacao do saldo inicial`
