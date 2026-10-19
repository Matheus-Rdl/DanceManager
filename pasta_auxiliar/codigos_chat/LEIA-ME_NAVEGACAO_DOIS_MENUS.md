# Dance Manager — Navegação de atividades com dois menus

Esta entrega altera **somente o frontend** e reorganiza as páginas já existentes da turma.

## Estrutura

- **Visão geral**: página de dados cadastrais da atividade (tipo de dança, professores, dias, horários etc.).
- **Alunos**: ao clicar, abre **Lista de alunos**. Dentro dela há opções para **Presenças** e **Mensalidades**.

As subopções são páginas existentes, não uma nova forma de registrar matrículas.

## Arquivos

Copie os arquivos de `frontend/src/` do ZIP para a mesma localização no seu projeto:

1. `components/ActivityNavigation.jsx` — navegação com os dois menus e três subopções.
2. `hooks/useActivityContext.js` — busca a turma por `activityMat` na URL, se necessário (versão já utilizada no pacote anterior).
3. `features/activities/pages/activityManagementDetailed.jsx` — preserva a Visão geral e incorpora a nova navegação.
4. `features/activities/pages/activityManagementUsers.jsx` — incorpora a navegação na Lista de alunos; mantém seleção e filtros já existentes, retirando o menu antigo de relatórios com ações vazias.
5. `features/activities/pages/activityAttendance.jsx` — incorpora a navegação na chamada e permite recuperar a turma pela URL.
6. `features/activities/pages/ActivityMonthlyFees.jsx` — mantém a tela existente de mensalidades da turma e incorpora a navegação.
7. `features/activities/pages/activityManagement.jsx` — atalhos da turma ficam com `Dados da Turma` e `Alunos`.
8. `main.jsx` — inclui a rota `/ActivityMonthlyFees` usada na versão anterior.
9. `utils/activityTeachers.js` e `features/activities/components/ActivityTeachersField.jsx` — auxiliares de professores que as telas já utilizam (incluídos para evitar erro de importação se estiverem ausentes).

## Teste recomendado

1. Reinicie o Vite após a cópia.
2. Entre em **Gestão de Atividades**, selecione uma turma e clique em **Dados da Turma**. Somente `Visão geral` e `Alunos` devem aparecer no menu principal.
3. Clique em **Alunos**. Deve abrir `Lista de alunos`, e abaixo devem aparecer `Lista de alunos`, `Presenças` e `Mensalidades`.
4. Alterne entre as três opções. Os dados precisam continuar pertencendo à mesma `activity_mat`.
5. Atualize a página do navegador em **Presenças** e **Mensalidades**. A turma deve ser recuperada pela matrícula na URL.
6. Confira que o cadastro/edição da atividade, as chamadas e as consultas financeiras continuam funcionando.

## Fora do escopo — NÃO alterado

- Backend, banco de dados e modelos MongoDB.
- Adicionar ou remover alunos da turma.
- Criação da coleção `activityEnrollments` e histórico de entradas/saídas.
- Contratos, mensalidades, pagamentos ou registros de presença existentes.

**Compatibilidade:** esta versão parte do frontend com professores vinculados e tela de mensalidades da turma, conforme as entregas anteriores. A consulta de mensalidades por `activityMat` depende das rotas do backend já usadas naquela entrega. Não implante código antigo do backend por cima da versão que você usa atualmente.

**Validação:** conferência estática dos arquivos, navegação e caminhos dos imports. Teste de execução do Vite e integração com seu MongoDB ainda deve ser feito localmente.
