# Dance Manager — restauração da tela Mensalidades Atrasadas

## Base utilizada
- `frontend(20261020-172059).zip`
- `backend(20261020-172050).zip`
- Referência da implementação antiga: `DanceManager_Mensalidades_Atrasadas_Completo.zip`

## O que foi recuperado
- Tela `Mensalidades atrasadas` com cobranças vencidas **de todas as competências e anos**, sem restringir ao mês escolhido na tela mensal.
- Rota frontend `#/MonthlyFeesOverdue`.
- Acesso pelo card de atrasos do Dashboard, pelos alertas do Dashboard e pelo botão `Ver todos os atrasos` em Mensalidades.
- Rota backend `GET /monthly-fees/overdue`, no padrão Router → Controllers → DataAccess.
- Cálculo do saldo a receber e dos dias de atraso; pagamentos parciais vencidos também aparecem.
- Filtros da tela de atrasos: busca, ano, atividade (quando disponível), pagamento e ordenação; acesso aos detalhes da mensalidade do aluno.

## Compatibilidade preservada
- Configurações continuam usando `SettingsPage` na rota `/configuracoes`.
- Gestão de Atividades continua com `ActivityMonthlyFees`.
- Consulta por turma com `filters.activityMat` no serviço de mensalidades preservada.
- Tela mensal, pagamentos, contratos e demais funcionalidades não foram substituídos por versões antigas.
- Nenhuma alteração no MongoDB, modelos ou dados é necessária.

## Instalação
1. Faça backup das pastas `frontend/src` e `backend/src` atuais.
2. Extraia o ZIP completo **na pasta raiz do projeto** (a que contém `frontend/` e `backend/`). Os ZIPs separados também usam os prefixos `frontend/` e `backend/`: extraia-os na mesma pasta raiz do projeto, para evitar criar `frontend/frontend` ou `backend/backend`.
3. Substitua somente os arquivos incluídos no pacote. **Não apague arquivos que não aparecem no ZIP.**
4. Reinicie backend e frontend. Confira `VITE_API_URL` no frontend.
5. Acesse `#/MonthlyFeesOverdue` diretamente, ou clique no card "Mensalidades atrasadas" do Dashboard.

## Arquivos modificados — frontend (6)
- `frontend/src/main.jsx`
- `frontend/src/home/home.jsx`
- `frontend/src/home/components/DashboardAlerts.jsx`
- `frontend/src/features/financial/monthlyFees/monthlyFees.jsx`
- `frontend/src/features/financial/monthlyFees/monthlyFeesOverdue.jsx` (novo)
- `frontend/src/services/monthlyFeesServices.jsx`

## Arquivos modificados — backend (3)
- `backend/src/modules/monthlyFees/monthlyFeesRouter.js`
- `backend/src/modules/monthlyFees/monthlyFeesControllers.js`
- `backend/src/modules/monthlyFees/monthlyFeesDataAccess.js`

## Regra de vencimento
- `dueDate` anterior ao dia atual no calendário de São Paulo.
- Mensalidade não cancelada.
- Valor original maior que `paidAmount`, mesmo se houver pagamento parcial.
- Valor mostrado em atraso = `amount - paidAmount`.
- A consulta não aplica filtro por competência ou ano; são filtros visuais opcionais.

## Roteiro de teste com banco real
1. Confirme que `GET /monthly-fees/overdue` retorna `{ success: true, body: [...] }` e **não** 404.
2. Tenha uma mensalidade de mês anterior vencida e sem pagamento: deve aparecer.
3. Registre um pagamento parcial em uma mensalidade vencida: ela continua na lista pelo saldo restante.
4. Quite uma mensalidade: após atualizar, ela deve desaparecer da lista.
5. Confira uma mensalidade cancelada: ela **não** deve aparecer.
6. Clique num aluno da lista para abrir `MonthlyFeesDetailed`, conferir a mensalidade e registrar pagamento.
7. Confira `ActivityMonthlyFees` e o filtro de mensalidades por turma (regressão).
8. Confirme que a rota de Configurações e o campo Professores permanecem funcionando (regressão).

## Validação executada
- Sintaxe JavaScript e JSX dos 9 arquivos verificada por parser TypeScript.
- Rotas, imports e preservação das funções atuais conferidos estaticamente.
- **Não** foi executado teste end-to-end com MongoDB nem build Vite completo; as dependências do projeto não vieram nos ZIPs (somente `src`).

## Observação de segurança
- O backend atual não implementa autorização administrativa completa. Recomenda-se proteger as operações financeiras antes de disponibilizar o sistema publicamente.
