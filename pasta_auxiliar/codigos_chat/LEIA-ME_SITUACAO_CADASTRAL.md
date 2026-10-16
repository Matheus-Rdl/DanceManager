# Dance Manager — Situação cadastral (1 a 4)

Base da correção: `frontend(8).zip` e `backend(9).zip`, enviados pelo usuário.

## Regras preservadas

No MongoDB, `user_situation` continua STRING:
- `"1"` = ATIVO (verde)
- `"2"` = AFASTADO (amarelo)
- `"3"` = CADASTRO PENDENTE (azul)
- `"4"` = INATIVO (cinza)

Nenhum registro existente é migrado ou alterado automaticamente. Situação cadastral não cancela contratos, pagamentos, mensalidades, vínculos com turmas ou chamadas.

## Arquivos modificados

FRONTEND:
- `src/utils/userSituation.js` (NOVO): normalização, labels, cores, tipo de aluno.
- `src/features/register/pages/peopleManagement.jsx`: coluna corrigida e filtro Situação.
- `src/components/StudentProfileHeader.jsx`: situação real e, quando solicitado, situação do contrato separada.
- `src/components/list.jsx`: badge colorido de situação nas listas genéricas.
- `src/features/register/pages/peopleManagementDetailed.jsx`: novos cadastros iniciam em `"3"`; retirado cabeçalho comentado antigo.
- `src/features/register/pages/peopleManagementActivities.jsx`: retirado cabeçalho comentado antigo.
- `src/features/register/pages/peopleManagementPayments.jsx`: retirado cabeçalho comentado antigo.
- `src/features/activities/pages/activityManagement.jsx`: quantidade ativa e vínculos históricos separados.
- `src/features/activities/pages/activityManagementUsers.jsx`: garante coluna Situação.
- `src/features/activities/pages/activityAttendance.jsx`: identifica alunos afastados, pendentes, inativos; preserva status de presença independente.
- `src/home/home.jsx`: texto do indicador Alunos ativos atualizado.
- `src/home/components/DashboardTodayClasses.jsx`: distingue ativos de vínculos totais.

BACKEND:
- `src/models/User.js`: schema string, default `"3"`, enum válido.
- `src/modules/users/usersControllers.js`: valida códigos de situação em novos cadastros e alterações.
- `src/modules/users/usersDataAccess.js`: suporte a vínculos de turma simples e por objeto.
- `src/modules/dashboard/dashboardDataAccess.js`: Alunos ativos = código `"1"` e tipo `1` (aluno) ou `2` (bolsista); aulas do dia mostram ativos/vínculos distintos.

`src/utils/userSelectOptions.js` NÃO FOI ALTERADO, pois já contém códigos e nomes corretos no ZIP enviado.

IMPORTANTE SOBRE user_type: no seu `frontend(8).zip`, 1=ALUNO, 2=BOLSISTA e 3=PROFESSOR(A). Isso difere da tabela `user_type` colada no chat. A contagem do Dashboard foi implementada com base no ZIP MAIS RECENTE. Se o banco estiver usando a outra codificação, ajuste os tipos ANTES de confiar na contagem de alunos ativos.

## Instalação

1. Faça backup dos arquivos de seu projeto atual.
2. Extraia o ZIP. Copie somente os arquivos em `frontend/src/` e `backend/src/` para suas pastas correspondentes, preservando os caminhos.
3. Verifique que `frontend/src/utils/userSelectOptions.js` mantém os quatro rótulos 1 a 4.
4. Reinicie o backend, recarregue o frontend, faça o teste abaixo.
5. Não precisa executar migração do MongoDB nem adicionar bibliotecas.

## Testes recomendados

1. Cadastre pessoa nova: a situação deve iniciar em CADASTRO PENDENTE (`"3"`), e poder ser salva como `"1"`, `"2"`, `"3"`, `"4"`.
2. Em Gestão de Pessoas, confira os quatro badges coloridos, a opção 'Não definida' e o filtro Situação (com Limpar).
3. Mude um aluno de ATIVO para AFASTADO. Confira cabeçalho, lista da turma, chamada (badge sem mexer nas presenças) e recálculo do Dashboard após atualização.
4. Confirme que a contagem de alunos ativos não inclui tipo professor (3) e não depende do contrato ativo.
5. Confira que contratos, pagamentos, mensalidades e presenças previamente registradas permanecem intactos.
6. Para registros antigos sem `user_situation`, a tela mostra 'Não definida'; não há classificação automática desses usuários como ativos.

## Verificações executadas

- Sintaxe de todos os arquivos JSX/JS alterados pelo parser TypeScript.
- `node --check` nos módulos JS do backend.
- Testes isolados dos 4 códigos, dos textos legados, de usuário sem código e da classificação dos tipos 1/2/3.
- Integração real com o MongoDB/navegador ainda precisa ser validada no seu ambiente.
