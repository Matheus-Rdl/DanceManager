# StudentProfileHeader - Dance Manager

## Arquivos
- `backend/src/modules/users/usersRouter.js` - adiciona `GET /users/:id`.
- `backend/src/modules/users/usersControllers.js` - valida ObjectId e utiliza o método `getUser()` já existente no DataAccess.
- `frontend/src/services/usersServices.jsx` - adiciona `fetchUserById` (também disponível como `getUserById`).
- `frontend/src/components/StudentProfileHeader.jsx` - cabeçalho + abas reutilizáveis.

O `usersDataAccess.js` **não precisa mudar**, pois já implementa `getUser(id)`.

## Uso: Visão geral
```jsx
import StudentProfileHeader from "../../../components/StudentProfileHeader";

<StudentProfileHeader userId={userId} activeTab="Visão geral" />
```

## Uso: Contratos (sem repetir requisição de contratos)
```jsx
<StudentProfileHeader
  userId={userId}
  activeTab="Contratos"
  activeContract={activeContract || null}
  contractsLoading={contractsLoading}
  showContractStatus
/>
```

## Outras abas
```jsx
<StudentProfileHeader userId={studentId} activeTab="Mensalidades" />
<StudentProfileHeader userId={studentId} activeTab="Pagamentos" />
<StudentProfileHeader userId={userId} activeTab="Turmas" />
```

**Substitua o bloco completo** que começa em `{/* NAVEGAÇÃO - DADOS DE USUÁRIO */}` e termina depois de `<StudentNavigation ... />` pelo componente. Remova imports antigos que ficaram sem uso. O `StudentNavigation` está dentro do novo componente; não adicione uma segunda navegação.

Opcional: `initialUserData={userData}` evita tela vazia enquanto a API responde; o componente sempre fará consulta pelo ID.

A etiqueta `Aluno ativo` foi mantida como no layout anterior e **não valida um status cadastral real**. Para considerar situação real, será necessário definir o campo no schema de usuário.

## Testes
1. Abra a aba de Contratos de um aluno existente.
2. Verifique `GET /users/:id` em Network, retornando `{success:true, body:{...}}`.
3. Confira matrícula, foto, nome e vigência.
4. Navegue para Mensalidades, Turmas e Pagamentos e confira se o mesmo aluno permanece selecionado.
5. Teste um ObjectId inválido (400) e um ID inexistente (404).
