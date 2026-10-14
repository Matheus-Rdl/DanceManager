# Dance Manager — Financeiro Geral (versão inicial)

## O que foi feito

Nesta versão do projeto, `/financeiro` era uma tela provisória. O pacote integra três abas:

- **Visão Geral:** mensalidades previstas e abertas; mensalidades em atraso da competência; recebimentos efetivamente registrados em `payments` pela data `paidAt`; despesas pagas por `paidAt`; resultado realizado (recebido menos despesas pagas); gráfico de seis meses.
- **Recebimentos:** histórico automático do módulo `payments`, incluindo nome/matrícula do aluno e competência vinculada à mensalidade. Nenhum recebimento é criado manualmente nesta tela.
- **Despesas:** cadastro avulso, categorias, filtros, edição de pendentes, quitação integral com valor real e data, cancelamento e despesas recorrentes mensais. Uma despesa paga não pode ser editada/cancelada pela interface ou pelas rotas deste módulo.

## Onde copiar os arquivos

Copie o **conteúdo das pastas** `backend/src` e `frontend/src` do ZIP para as pastas `src` correspondentes em seus respectivos projetos. Preserve todo o restante do projeto, especialmente os módulos existentes de contratos, mensalidades e pagamentos.

### Backend: arquivos novos

- `backend/src/models/Expense.js`
- `backend/src/models/ExpenseRecurrence.js`
- `backend/src/modules/expenses/expenseRules.js`
- `backend/src/modules/expenses/expenseGeneration.js`
- `backend/src/modules/expenses/expensesDataAccess.js`
- `backend/src/modules/expenses/expensesRouter.js`
- `backend/src/modules/financial/financialRouter.js`

### Backend: arquivo alterado

- `backend/src/index.js` — registra `/expenses`, `/financial`, cria índice único e dispara geração na inicialização e periodicamente.

### Frontend: arquivos novos

- `frontend/src/services/expensesServices.jsx`
- `frontend/src/services/financialServices.jsx`
- `frontend/src/features/financial/general/FinancialGeneral.jsx`

### Frontend: arquivo alterado

- `frontend/src/main.jsx` — aponta a rota `/financeiro` para `FinancialGeneral`.

## Variáveis de ambiente

Utilize as configurações MongoDB já existentes. Opcionalmente defina **`SCHOOL_ID=default`** no backend para o identificador da escola única atual. Por enquanto, ele é lido no servidor, **não do frontend**. Não troque esse ID em uma base com registros de despesas sem planejar a migração: os registros anteriores manteriam o ID anterior.

A URL da API no frontend continua usando `VITE_API_URL`, sem mudanças.

## Recorrência — regras

1. Cada recorrência armazena descrição, categoria, valor, dia de vencimento e competência inicial.
2. São criados lançamentos do início até o **mês atual + dois meses**. Ex.: em outubro, outubro/novembro/dezembro; em novembro, janeiro é acrescentado.
3. Em datas 29, 30 ou 31, o vencimento é limitado ao último dia do mês.
4. Índice único `{ schoolId, recurrenceId, reference }` evita lançamentos duplicados, inclusive quando duas instâncias executam a geração.
5. A execução ocorre ao iniciar o servidor, a cada seis horas enquanto o processo está ativo, e sob demanda ao consultar despesas ou resumo financeiro. **Se a hospedagem suspender o backend, não haverá execução durante a suspensão; ao acordar/receber consulta, a geração é retomada.** Para garantia em horário exato, configure futuramente um agendador externo persistente.
6. Uma despesa recorrente pode ser editada individualmente (somente se pendente, e sem mudar o mês), ou a regra pode ser editada para o mês atual ou os próximos dois meses, afetando as competências futuras **ainda pendentes**.
7. Encerrar recorrência impede geração e cancela apenas competências futuras pendentes; preserva a competência atual, o histórico e todos os registros pagos.
8. A edição de recorrência com efeito em uma competência além da janela atual de três meses foi restringida até implementar versionamento de regras para datas muito futuras.

## Endpoints implementados

- `GET /expenses?reference=YYYY-MM`
- `POST /expenses`
- `PUT /expenses/:id`
- `POST /expenses/:id/pay`
- `POST /expenses/:id/cancel`
- `GET /expenses/recurrences`
- `POST /expenses/recurrences`
- `PUT /expenses/recurrences/:id`
- `POST /expenses/recurrences/:id/stop`
- `GET /financial/summary?month=YYYY-MM`
- `GET /financial/receipts?month=YYYY-MM`

Respostas seguem a estrutura `{ success, statusCode, body }` do projeto.

## Teste recomendado em desenvolvimento

1. Abra `#/financeiro`, vá à aba Despesas e registre uma despesa avulsa; verifique na lista.
2. Quite essa despesa com data de hoje e valor real; confirme no resumo financeiro.
3. Cadastre uma despesa recorrente com vencimento no dia 31. Confira as três competências na seleção de meses, inclusive fevereiro quando chegar o período.
4. Recarregue a página: a geração não deve duplicar despesas.
5. Edite a regra e confirme a alteração apenas nos lançamentos pendentes a partir da competência indicada.
6. Encerre a regra; as competências futuras pendentes devem ser canceladas.
7. Registre um pagamento de mensalidade por meio da tela já existente e confirme sua presença na aba Recebimentos e no resultado realizado do respectivo **mês do pagamento**, mesmo que a mensalidade pertença a outra competência.
8. Teste sem despesas nem pagamentos, no computador e no celular.

## Atenções antes de publicar para escolas

**Não há autenticação/autorização nas rotas antigas nem novas do projeto recebido.** Este pacote é para **desenvolvimento e validação local**. Antes de produção real, é obrigatório autenticar as requisições e verificar permissões administrativas/financeiras no servidor. O histórico de despesas registra a alteração e seu horário, mas **não identifica o operador** até que exista login.

A identificação `schoolId` protege apenas as novas coleções de despesas pelo ID configurado no servidor nesta fase de escola única. As coleções existentes de `payments` e `monthlyFees` ainda não estão isoladas por escola. **Não ative múltiplas escolas com dados reais antes de isolar todas essas coleções e validar o escopo por sessão.**

O resumo atual representa movimentações do período, não o saldo da conta bancária. Despesas têm quitação integral (não parcial), com valor efetivamente pago que pode divergir do previsto. Não foram implementadas receitas avulsas.

## Validação realizada

- Sintaxe dos arquivos JavaScript do backend: `node --check`.
- Sintaxe JSX e de services/frontend: parser JSX do TypeScript.
- Testes isolados das regras de datas, competência, valores e idempotência da recorrência.
- **Não foi possível executar o frontend ou operações completas no MongoDB:** os ZIPs enviados continham somente a pasta `src`, sem `package.json`, dependências nem banco conectado. Faça o teste acima antes de utilizar em produção.
