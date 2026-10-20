# Dance Manager — Configurações Etapa 4: Opções de campos (tipos 2 e 3)

Esta etapa **pressupõe a Etapa 3 (Menus e ordem) já instalada**. A aba Planos não foi alterada.

## 1. Faça backup

Salve uma cópia do banco MongoDB, em especial `fields`, e do projeto frontend/backend.

## 2. Prepare os dados ANTES de atualizar a aplicação

### A. Importe a coleção `fieldOptions`

Arquivo: `database/DanceManager.fieldOptions_sem_id.json` (17 listas estáticas, 78 opções, sem `_id`).

No MongoDB Compass, selecione a base do Dance Manager, crie a collection **`fieldOptions`**, se necessário, e use **Add Data > Import JSON** para importar o array.

**Se `fieldOptions` já possuir documentos, NÃO importe o JSON outra vez**: isso pode duplicar dados. Nesse caso, execute o script `database/Importar_fieldOptions_sem_duplicar.mongosh.js` pelo mongosh ou Compass Playground; ele faz upsert com `$setOnInsert`, criando apenas listas ainda inexistentes.

**Não importamos** `user_activities` (contém cadastros fictícios de teste), `type` e `required` (constantes técnicas). O restante foi extraído do `userSelectOptions.js` do seu projeto.

### B. Habilite as permissões em `fields`

Execute no mongosh/Compass Playground:

`database/Definir_optionsEditable_Etapa4.mongosh.js`

Ele atualiza SOMENTE `optionsSource` e `optionsEditable` dos 6 campos de seleção do JSON. Campo `activity_type` fica editável; `activity_active`, `activity_days`, `user_situation`, `user_type` e `activity_teachers` ficam protegidos. Professores permanece dinâmico.

O arquivo `database/DanceManager.fields_Etapa4_sem_id.json` contém os 17 documentos atualizados **sem `_id`/`id`** para conferência, mas **não reimporte por cima da coleção existente**, pois o Compass poderá criar registros duplicados. Prefira o script acima.

## 3. Substitua arquivos

Extraia o ZIP completo na raiz do seu repositório, preservando as pastas `frontend/src` e `backend/src`. Ou use os ZIPs separados se as duas partes estão em pastas diferentes.

Backend:
- `src/index.js` (adiciona `/field-options`)
- `src/models/FieldOptions.js`
- `src/modules/fieldOptions/fieldOptionsRouter.js`
- `src/modules/fieldOptions/fieldOptionsDataAccess.js`

Frontend:
- `src/features/settings/SettingsPage.jsx` (terceira aba Opções no Dialog de campo 2/3)
- `src/features/settings/FieldOptionsPanel.jsx`
- `src/utils/userSelectOptions.js` (carrega o catálogo da API com cache e atualização)
- `src/utils/legacySelectOptions.js` (fallback temporário seguro se a API falhar)
- `src/components/formTextArea.jsx` (seletores usam catálogo do MongoDB)
- `src/components/headerFilter.jsx`, `src/components/list.jsx`
- `src/components/cards/cardActivity.jsx`, `src/components/cards/cardActivitySelect.jsx`
- `src/features/register/pages/peopleManagement.jsx`

Reinicie backend e frontend após as substituições.

## 4. Teste

1. Abra `GET /field-options/catalog`; confirme listas `activity_type` e `user_situation` com seus códigos antigos.
2. Configurações > Campos > Atividades > Tipo da turma > aba **Opções**.
3. Adicione "ZOUK"; o backend deve gerar código **5** (sem substituir códigos 1-4).
4. Verifique que ZOUK aparece em Gestão de Atividades sem mudar o código React.
5. Renomeie a opção, mude sua ordem e desative-a; confira que não aparece em novos selects, mas continua identificável em registros antigos.
6. Em **Professores**, confira lista dinâmica e ausência de botões de edição.
7. Em **Dia da semana** e **Situação**, os valores continuam legíveis, porém protegidos.

## Regras de proteção

- IDs/códigos são imutáveis; exclusão física não existe nesta etapa.
- O backend exige `optionsEditable === true` no respectivo documento de `fields`; `optionsManageable` NÃO libera edição.
- `optionsSource: "dynamic"` bloqueia mutações; Professores continua consultando `/activities/teachers`.
- Listas compartilhadas não podem ser alteradas se outro campo associado estiver protegido.
- Concorrência: atualização otimista por `revision` (HTTP 409 se houve alteração desde a leitura).
- Campo obrigatório precisa manter ao menos uma opção ativa.
- Enquanto o backend não responder, o frontend mantém a lista antiga como fallback, mas a configuração dinâmica depende da API e dos dados MongoDB.
- **Sem autenticação administrativa**, as rotas de escrita ainda não devem ser expostas em produção pública. Proteger antes de liberar para usuários finais.

## Verificações realizadas

- Sintaxe JavaScript/JSX nas partes alteradas.
- Testes locais isolados das operações de adicionar, renomear, desativar, reordenar e conflitos.
- Unicidade de códigos no JSON e verificação de integridade dos ZIPs.
- **Não foi possível testar com seu MongoDB real nem com a aplicação executando no navegador.**
