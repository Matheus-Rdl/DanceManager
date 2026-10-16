# Dance Manager — Dashboard principal (16/10/2026)

## Instalação

O ZIP completo contém apenas os arquivos novos/alterados, já com a estrutura `frontend/src/` e `backend/src/`.

1. Faça backup dos arquivos do projeto antes de substituir.
2. Copie `backend/src/index.js` e a pasta `backend/src/modules/dashboard/` para os mesmos caminhos no seu backend.
3. Copie `frontend/src/home/home.jsx`, `frontend/src/home/components/` e `frontend/src/services/dashboardServices.js` para os mesmos caminhos no frontend.
4. Reinicie o servidor Node e o Vite.
5. Abra a rota inicial `/#/` do frontend e clique em **Atualizar**.

Não mexer no `main.jsx` nem no banco. A rota `/` já usa `Home`.

## Novo endpoint

`GET http://localhost:3000/dashboard/summary` (a URL deve respeitar a porta definida em API_PORT).

Resposta no formato atual da API: `{success:true,statusCode:200,body:{asOf,month,metrics,finance,todayClasses,alerts}}`.

## Definições dos indicadores

- **Alunos ativos**: usuários existentes associados a pelo menos um contrato com `active: true`. Não é o total de cadastros e não depende de status de mensalidade.
- **Turmas ativas**: `activities.activity_active === 1`.
- **Recebido no mês**: soma de `payments.amount` usando `paidAt` no mês atual brasileiro.
- **Despesas pagas**: soma de `expenses.paidAmount` somente com `status: paid` no mês de `paidAt` e no `schoolId` configurado no servidor.
- **Resultado realizado**: recebido - despesas efetivamente pagas. Não é saldo bancário.
- **Mensalidades atrasadas**: todas as cobranças não canceladas, vencidas até ontem, com valor ainda não pago; as parcialmente pagas contam pelo restante.
- **Despesas pendentes próximas**: despesas com status `pending` e vencimento até sete dias à frente (inclui atrasadas).
- **Contratos próximos do fim**: contratos `active: true` com `plannedEndDate` entre hoje e os próximos 30 dias; contratos indeterminados não entram.
- **Aulas de hoje**: atividades ativas cujo `activity_days` coincide com o dia da semana (1=segunda, 7=domingo), com professor e número de usuários vinculados via `user_activities`.

**Nota:** alguns documentos mais antigos podem não possuir os campos opcionais de professor/vínculo; nesses casos o painel mostra "Professor não informado" ou 0 vínculos. Os dados do dashboard são reais; não há exemplos fictícios.

## Acessos rápidos

- Cadastrar aluno: `/PeopleManagement/add` (state `{currentMode:'A'}`)
- Turmas e aulas: `/ActivityManagement`
- Mensalidades: `/MonthlyFees`
- Financeiro: `/financeiro`

Os indicadores e alertas também levam à seção relevante; os filtros detalhados continuam nas telas específicas.

## Checklist de teste

1. `http://localhost:3000/dashboard/summary` deve responder com `success: true`.
2. `/#/` deve mostrar os quatro indicadores e, abaixo, os acessos rápidos.
3. Confirme o recebido em Financeiro Geral usando o mês atual.
4. Confirme o número de turmas ativas em Gestão de Atividades.
5. Teste o botão Cadastrar aluno, a navegação e o layout no celular.
6. Se não houver aulas hoje, deve aparecer a mensagem de estado vazio.
7. Se o endpoint falhar, o erro aparecerá e os Acessos rápidos continuarão disponíveis.

## Segurança e próximos passos

O backend fornecido ainda não tem autenticação e segregação por escola aplicadas a usuários, turmas, contratos e pagamentos. O `schoolId` atual só filtra despesas; **não publique o Dashboard com dados reais para múltiplas escolas antes de implementar autenticação, autorização e isolamento de dados**. Não alterar a API ou interpretar este endpoint como seguro por si só.

## Arquivos

**Backend:**
- `backend/src/index.js` (registro do novo router)
- `backend/src/modules/dashboard/dashboardRouter.js`
- `backend/src/modules/dashboard/dashboardControllers.js`
- `backend/src/modules/dashboard/dashboardDataAccess.js`

**Frontend:**
- `frontend/src/home/home.jsx`
- `frontend/src/home/components/DashboardStatCard.jsx`
- `frontend/src/home/components/DashboardQuickActions.jsx`
- `frontend/src/home/components/DashboardFinancialSummary.jsx`
- `frontend/src/home/components/DashboardTodayClasses.jsx`
- `frontend/src/home/components/DashboardAlerts.jsx`
- `frontend/src/services/dashboardServices.js`
