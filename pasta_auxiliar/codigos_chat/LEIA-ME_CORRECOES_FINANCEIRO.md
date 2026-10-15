# Dance Manager — Seletor de competência e correções de despesas

## O que instalar

Pacote incremental: copie **somente os arquivos contidos neste ZIP** sobre os arquivos existentes, preservando a estrutura `backend/src/...` e `frontend/src/...`.

### Backend (5 arquivos)
- `backend/src/models/Expense.js`: histórico antes/depois e novo estado `zeroed`.
- `backend/src/modules/expenses/expensesDataAccess.js`: correção de despesas pagas, cancelamento e zeramento auditados, exclusão restrita e prevenção de gravações concorrentes.
- `backend/src/modules/expenses/expensesControllers.js`: novos métodos dentro do padrão Router → Controller → DataAccess.
- `backend/src/modules/expenses/expensesRouter.js`: rotas novas e justificativa para cancelamentos.
- `backend/src/modules/financial/financialDataAccess.js`: exclui despesas zeradas dos valores previstos da competência.

### Frontend (2 arquivos)
- `frontend/src/features/financial/general/FinancialGeneral.jsx`: seletor mês/ano/setas/mês atual; formulários para corrigir despesas pagas; ações de zerar/cancelar/excluir; diálogo de histórico.
- `frontend/src/services/expensesServices.jsx`: requisições novas.

**Os arquivos `FinancialTimelineChart.jsx`, `financialServices.jsx`, `monthlyFees` e `payments` não mudaram.** O gráfico seguirá o comportamento e a escala da versão anterior.

## Compatibilidade com API
- `PUT /expenses/:id`: mantém a edição de despesas pendentes. Para **paga**, exige também `paidAmount`, `paidAt` (`YYYY-MM-DD`), `method` e `reason` (justificativa). Permite alterar os demais campos da despesa.
- `POST /expenses/:id/cancel`: agora exige corpo `{ "reason": "..." }`, tanto pendentes quanto pagas.
- `POST /expenses/:id/zero`: nova rota, exige `{ "reason": "..." }`; status final `zeroed` e valor `0`, registra situação anterior no histórico.
- `DELETE /expenses/:id`: nova rota. Exclusão definitiva somente de despesa **avulsa**, **pendente**, **nunca paga** e com histórico apenas de criação. Despesas recorrentes não podem ser excluídas definitivamente para evitar recriação pela rotina automática.
- `GET /expenses?reference=YYYY-MM`: permanece igual, inclui `history` com motivos e dados anteriores/novos.

## Regras importantes
- A **competência de uma despesa é a competência do vencimento**. Para avulsas, corrigir o vencimento pode mudar o mês onde o registro é listado.
- Os **valores realizados** são classificados pela data efetiva de pagamento (`paidAt`). Uma correção da data de pagamento atualiza o mês anterior e o novo mês no gráfico e no resumo.
- Cancelar uma despesa paga deixa a quitação original e os dados anteriores preservados no histórico, mas não soma mais ao realizado.
- Zerar uma despesa paga preserva um retrato da quitação anterior no histórico e remove o pagamento da apuração; **não é um desembolso de R$ 0,00**.
- A edição de **um lançamento recorrente** não altera a regra da recorrência. Não é permitido mover seu vencimento para outra competência; corrija o dia dentro do mesmo mês.
- A edição da **regra** continua afetando somente competências futuras pendentes, como antes.
- A exclusão permanente é irreversível e, por definição, não mantém um histórico da despesa excluída.

## Testes sugeridos (usar base de desenvolvimento)
1. Abrir Financeiro Geral, navegar pelas setas de mês; selecionar mês e ano diretamente; usar 'Mês atual'.
2. Criar uma despesa avulsa pendente. Editar descrição e vencimento. Conferir a mudança de competência.
3. Criar outra despesa avulsa, marcar como paga, e **corrigir** valor, data de pagamento e forma com justificativa; conferir o histórico antes/depois.
4. Confirmar que, se o pagamento mudou de setembro para outubro, o total realizado de setembro diminui e o de outubro aumenta.
5. Cancelar uma despesa paga com justificativa; conferir que sai do resultado e permanece no histórico.
6. Zerar uma despesa paga com justificativa; conferir status `Zerada`, `R$ 0,00` e histórico completo.
7. Excluir uma **avulsa recém-criada** (ainda pendente) e conferir que desaparece. Tentar excluir uma recorrente ou paga (deve ser bloqueado).
8. Cadastrar uma despesa recorrente e conferir que as ocorrências futuras não se duplicam nem são modificadas quando se corrige uma ocorrência paga.

## Cuidados antes de produção
- Faça backup do MongoDB antes de instalar ou testar operações destrutivas.
- O backend enviado anteriormente ainda não implementa autenticação e permissão por perfil nas rotas financeiras. **Não publique as ações de corrigir, cancelar, zerar ou excluir em produção sem essa proteção.**
- O histórico registra data, motivo e campos antigos/novos. A identificação de **quem** fez a alteração dependerá da autenticação de funcionários/administradores.
- Foram verificados a sintaxe do backend e JSX, e foram executados testes isolados das regras de alteração. **Não foi realizado teste integrado no MongoDB real nem no navegador.**
