# DanceManager — Commit 03/20: onde colocar cada arquivo

**Raiz de extração: `C:\Projetos\DanceManager\backend\`**

O ZIP já contém a hierarquia correta. Extraia seu conteúdo diretamente na pasta `backend`, **não** dentro de `backend\src` e **não** dentro de `backend\tests`.

## Arquivos novos (criar nestes caminhos)

| Nome | Caminho a partir de `backend\` | Caminho completo no Windows |
|---|---|---|
| Regras de contas | `src\modules\financialAccounts\financialAccountsRules.js` | `C:\Projetos\DanceManager\backend\src\modules\financialAccounts\financialAccountsRules.js` |
| Acesso ao banco | `src\modules\financialAccounts\financialAccountsDataAccess.js` | `C:\Projetos\DanceManager\backend\src\modules\financialAccounts\financialAccountsDataAccess.js` |
| Controlador | `src\modules\financialAccounts\financialAccountsControllers.js` | `C:\Projetos\DanceManager\backend\src\modules\financialAccounts\financialAccountsControllers.js` |
| Rotas | `src\modules\financialAccounts\financialAccountsRouter.js` | `C:\Projetos\DanceManager\backend\src\modules\financialAccounts\financialAccountsRouter.js` |
| Testes novos | `tests\finance\financialAccountsApi.test.mjs` | `C:\Projetos\DanceManager\backend\tests\finance\financialAccountsApi.test.mjs` |

## Arquivo existente a atualizar (atenção: preservar mudanças locais)

| Nome | Caminho a partir de `backend\` | Caminho completo no Windows |
|---|---|---|
| Entrada do servidor | `src\index.js` | `C:\Projetos\DanceManager\backend\src\index.js` |

O `src\index.js` incluído no ZIP foi baseado no código enviado em **19/11/2026**. Se você alterou esse arquivo depois, NÃO o substitua sem revisar as diferenças. Basta incorporar nele os **quatro pontos** do novo arquivo: dois imports (router e model), registro de `app.use("/financial-accounts", financialAccountsRouter)` e `await FinancialAccount.init()`.

## Arquivos do Commit 02 necessários (já devem estar no seu backend)

- `src\models\FinancialAccount.js`
- `src\models\financialAccountRules.js`

Eles **não** estão repetidos neste ZIP para não misturar commits.

## O que este commit acrescenta

- `GET /financial-accounts` — lista contas da escola atual; opcional `?active=true` ou `?active=false`.
- `GET /financial-accounts/:id` — obtém conta por seu ID UUID.
- `POST /financial-accounts` — cadastra conta (saldos iniciais informados manualmente).
- `PATCH /financial-accounts/:id` — modifica somente `name`, `type` e `active`.
- A API usa as respostas existentes `{ success, statusCode, body }` e `schoolId` configurado no servidor.
- O modelo impede duplicidade de nome e de conta padrão por escola (índices inicializados no servidor).
- Não inclui exclusão definitiva; não altera mensalidades, proventos, despesas, transferências nem frontend.

Exemplo do corpo de cadastro (apenas para testar localmente, NÃO é necessário cadastrar as contas reais agora):

```json
{
  "name": "Noh",
  "type": "bank",
  "initialBalance": 0,
  "balanceDate": "2026-11-19",
  "isDefault": true
}
```

O cadastro inicial definitivo de **Noh** e **InfinitePay** está planejado para o Commit 04.

## Como executar os testes no PowerShell

```powershell
cd C:\Projetos\DanceManager\backend
node --test .\tests\finance\financialAccountsApi.test.mjs
node --test .\tests\finance\*.test.mjs
```

**Resultado de referência deste pacote:** 18 testes novos; 60 testes totais (com os commits 01 e 02), todos aprovados em testes isolados com Node.js v22.16.0.

**Limite dos testes:** o pacote original não trazia `package.json` nem `node_modules`. Os testes simulam dependências externas e consultas ao banco. Ainda falta validar no ambiente completo com Express, Mongoose e MongoDB real.

## Atenção antes de publicar

O backend enviado não apresenta middleware de autenticação/autorização nas rotas financeiras. As novas rotas seguem o padrão atual, **mas não devem ser expostas em produção antes de adicionar controle de acesso**. Este commit é para revisão e testes em ambiente controlado; isso será uma condição para a liberação do módulo financeiro.

## Mensagem de commit

`feat(financeiro): criar API de cadastro e consulta de contas financeiras`
