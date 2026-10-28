# Dance Manager — Etapa 5: Planos dinâmicos

Base: repositório `Matheus-Rdl/DanceManager`, branch `main` (commit `65501883a53f743a808b066445bc79ef251e0fa9`, 20/10/2026). A versão ZIP local fornecida em 20/10 é idêntica nos arquivos utilizados, exceto `monthlyFees.jsx`, cujo link de **Ver todos os atrasos** foi preservado da branch main.

## Escopo

- Configurações > **Planos**: lista, criação, edição e ativação/desativação.
- 12 cores prontas, com pré-visualização e fundo/texto de contraste.
- Modalidades **Mensal (1)**, **Semestral (6)** e **Anual (12)**, ativáveis individualmente, valor mensal e total calculado.
- Tipos especiais do sistema: **Mensal = azul**, **Personalizado = roxo**, **Bolsista = dourado**. As cores desses tipos são fixas.
- Backend: `Plan` e `/plans` com estrutura Router → Controllers → DataAccess.
- Inicialização automática de Raiz, Balanço, Imersão e Beco com preços existentes, somente quando ainda não houver nenhum plano cadastrado.
- Contratos novos do tipo Plano: backend verifica plano/duração ativos e determina o valor mensal com base no cadastro do banco, ignorando preços enviados pela tela.
- Contratos existentes: preservam seu valor. Alterar preço, duração ativa ou situação do plano não recalcula mensalidades antigas; para evitar alteração indireta da referência de preço, não se troca plano/duração em contratos já criados. Outros ajustes continuam sujeitos às regras existentes.
- Mensalidades: etiquetas passam a carregar cores dos planos; as cores dos status Pago/Pendente/Atrasado não são alteradas.
- Botão **Ver todos os atrasos**, existente no GitHub, foi preservado.

## Instalação

1. Faça backup e crie uma branch de trabalho no Git, por exemplo `feature/configuracoes-planos`.
2. Extraia os arquivos do pacote na **raiz do projeto** (a pasta que contém `frontend` e `backend`). Substitua somente os arquivos listados.
3. Reinicie backend e frontend. Não há novas dependências nem alteração manual necessária no MongoDB; o Mongoose cria a coleção `plans` quando o primeiro cadastro ocorre.
4. Acesse `#/configuracoes` → Planos. O primeiro GET `/plans` inicializa os planos legados caso a coleção esteja vazia.
5. Revise os preços legados antes de oferecer novos contratos.

## Endpoints

- `GET /plans` — lista planos, inclusive inativos.
- `POST /plans` — cria um plano.
- `PATCH /plans/:id` — edita valores, cores, descrição e situação.

## Testes sugeridos

1. Conferir os quatro planos históricos, suas 12 cores selecionáveis e seus valores.
2. Criar um novo plano **Zouk**, selecionar rosa, ativar apenas Mensal e Semestral, verificar total.
3. Criar um novo contrato utilizando Zouk e conferir preço mensal e mensalidades geradas.
4. Reajustar Zouk; conferir que contrato anterior e mensalidades já geradas mantêm o preço, enquanto novo contrato usa valor novo.
5. Desativar Zouk: não deverá ser oferecido para novos contratos, mas contratos antigos continuam visíveis.
6. Confirmar cores diferentes de Mensal, Personalizado e Bolsista em Contratos/Mensalidades.
7. Confirmar acesso a Mensalidades Atrasadas e Configurações → Campos.

## Verificações já feitas

- Sintaxe JavaScript (`node --check`) e análise sintática JSX (TypeScript parser).
- Testes isolados das regras de 12 cores, nome reservado, valor positivo e preço por duração.
- Verificações estáticas de preservação da rota de Mensalidades Atrasadas e do componente antigo de Campos.

**Ainda não foram feitos** testes integrados no seu MongoDB ou execução completa de `npm run build` porque o ambiente de montagem não inclui as dependências do projeto.

**Segurança:** o Dance Manager ainda não aplica autorização administrativa para novas rotas de escrita; não exponha `/plans` à internet sem autenticação e permissão de administrador.

## GitHub

O ZIP não executa push nem merge na sua branch. Instale e teste localmente e faça commit/push para manter o GitHub atualizado. Evite enviar `.env` ou credenciais.
