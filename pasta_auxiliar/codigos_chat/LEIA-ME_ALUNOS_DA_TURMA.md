# Dance Manager — Gerenciar alunos da turma

Atualização preparada a partir de `frontend(9).zip`, `backend(10).zip` e da última navegação de dois menus instalada. **Instalar FRONTEND e BACKEND juntos.**

## Arquivos incluídos

**Frontend**
- `frontend/src/features/activities/pages/activityManagementUsers.jsx` — tela de participantes, indicadores, busca, filtro, ordenação, ações, diálogos de inclusão e retirada.
- `frontend/src/features/activities/pages/activityAttendance.jsx` — torna as presenças antigas consultáveis após retirada do vínculo.
- `frontend/src/services/activityStudentsServices.js` — novo serviço para API de vínculos.
- `frontend/src/services/attendancesServices.jsx` — proteção contra resposta atrasada da chamada e validação da resposta de salvamento.

**Backend**
- `backend/src/modules/users/usersRouter.js` — novas rotas.
- `backend/src/modules/users/usersControllers.js` — validação de turma, alunos e confirmações.
- `backend/src/modules/users/usersDataAccess.js` — inclusão e retirada dos vínculos atuais e sincronização dos tipos de atividade.
- `backend/src/modules/users/activityStudentRules.js` — novas funções auxiliares de vínculo.
- `backend/src/modules/attendances/attendancesDataAccess.js` — acrescenta nomes dos alunos históricos na resposta, sem alterar os documentos de presença.

## Instalação

1. Faça backup do projeto e do banco antes de testar, especialmente dos arquivos acima.
2. Extraia o ZIP na raiz da sua pasta `DanceManager` ou copie os arquivos respeitando os caminhos `frontend/src/` e `backend/src/`.
3. **Não apague os arquivos existentes das pastas**; substitua somente os nove caminhos indicados.
4. Reinicie o backend e o Vite.
5. Abra Gestão de Atividades > turma > Alunos > Lista de alunos.

Não é necessário criar uma coleção, migrar MongoDB nem instalar dependências novas. O componente `ActivityNavigation.jsx` de **dois menus**, instalado no passo anterior, permanece intacto.

## Regras

- GET `/users/activity/:mat` lista os vínculos existentes, como antes.
- GET `/users/activity/:mat/candidates?search=...` lista até 100 candidatos não vinculados do tipo ALUNO (1) ou BOLSISTA (2).
- POST `/users/activity/:mat/students` recebe `{ "userIds": ["id1", "id2"], "confirmNonActive": true|false }`; permite até 50 IDs por vez.
- DELETE `/users/activity/:mat/students/:userId` retira somente o vínculo atual do aluno com a turma.
- Usuários AFASTADOS (2) ou INATIVOS (4) exigem confirmação na interface e também no backend para inclusão.
- CADASTRO PENDENTE (3) pode ser vinculado sem confirmação extra; a situação permanece inalterada.
- IDs duplicados ou vínculos já existentes não devem criar uma segunda matrícula na mesma turma.
- Após incluir/retirar, `user_activity_types` é recalculado a partir das turmas ainda vinculadas.
- Não altera `contracts`, `monthlyFees`, `payments`, nem apaga documentos de `attendances`.
- Consultando uma chamada antiga, os participantes salvos naquela data aparecem mesmo que tenham sido retirados da turma, com etiqueta **Fora da turma • histórico**, em modo somente leitura.
- **Não registra data de entrada ou saída**: a coleção `activityEnrollments` e o histórico de vinculação ficaram para uma segunda etapa. Se uma chamada nunca foi registrada, não é possível recuperar a lista de alunos dela após a retirada.

## Testes manuais recomendados

1. Vincule um aluno ATIVO e um BOLSISTA; confira a lista e Gestão de Pessoas.
2. Selecione um aluno AFASTADO ou INATIVO e confira a confirmação obrigatória.
3. Pesquise e tente inserir novamente quem já está vinculado (não deve aparecer como candidato).
4. Registre uma presença em uma data de teste, retire o aluno e consulte novamente a **mesma data**. O nome e a presença antiga devem permanecer.
5. Confira que o aluno retirado não aparece em chamadas **novas** sem registro prévio.
6. Confira que as mensalidades e os pagamentos do aluno ainda existem em Gestão de Pessoas.
7. Teste desktop, celular e navegação entre Visão Geral > Alunos > Lista / Presenças / Mensalidades.

## Limitações e cuidados

- Como o projeto ainda não possui autenticação/autorização financeira e administrativa, **não exponha as novas rotas em produção pública** antes de implementar permissões por escola e por perfil.
- A inclusão em lote aplica atualizações por usuário. Não usa transação MongoDB multirregistro; se ocorrer uma falha inesperada durante o lote, atualize a listagem e verifique os vínculos concluídos antes de repetir.
- No estado atual do banco, as mensalidades pertencem ao contrato do aluno, não exclusivamente à turma. Esta atualização não altera essa regra.
- Testes de sintaxe e das funções de vínculo foram executados; a integração com seu MongoDB e o teste visual precisam ser feitos no seu ambiente.
