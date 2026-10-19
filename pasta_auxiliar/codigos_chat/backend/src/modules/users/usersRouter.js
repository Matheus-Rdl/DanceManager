import express from "express";
import UsersControllers from "./usersControllers.js";

const usersRouter = express.Router()

const usersControllers = new UsersControllers()

usersRouter.get('/', async (req, res) => {
  const { success, statusCode, body } = await usersControllers.getUsers()

  res.status(statusCode).send({ success, statusCode, body })
})

usersRouter.get('/nextMat', async (req, res) => {
  const { success, statusCode, body } = await usersControllers.getNextUserMat()

  res.status(statusCode).send({ success, statusCode, body })
})

// Buscar usuários que fazem parte de uma atividade (curso)
usersRouter.get('/activity/:mat', async (req, res) => {
  const { mat } = req.params;
  const { success, statusCode, body } = await usersControllers.getUsersByActivity(mat);
  res.status(statusCode).send({ success, statusCode, body });
});

/* Rotas específicas devem preceder GET /:id. */
usersRouter.get('/activity/:mat/candidates', async (req, res) => {
  const result = await usersControllers.getActivityStudentCandidates(req.params.mat, req.query.search);
  res.status(result.statusCode).send(result);
});

usersRouter.post('/activity/:mat/students', async (req, res) => {
  const result = await usersControllers.addStudentsToActivity(
    req.params.mat, req.body?.userIds, req.body?.confirmNonActive === true
  );
  res.status(result.statusCode).send(result);
});

usersRouter.delete('/activity/:mat/students/:userId', async (req, res) => {
  const result = await usersControllers.removeStudentFromActivity(req.params.mat, req.params.userId);
  res.status(result.statusCode).send(result);
});

usersRouter.get('/type', async (req, res) => {
  const { types } = req.query;

  const { success, statusCode, body } =
    await usersControllers.getUsersByType(types);

  res.status(statusCode).send({ success, statusCode, body });
});

/* Retorna somente o aluno informado no parâmetro. */
usersRouter.get('/:id', async (req, res) => {
  const { success, statusCode, body } = await usersControllers.getUserById(req.params.id);
  res.status(statusCode).send({ success, statusCode, body });
});

usersRouter.post('/', async (req, res) => {
  const { success, statusCode, body } = await usersControllers.addUser(req.body)

  res.status(statusCode).send({ success, statusCode, body })
})

usersRouter.delete('/:id', async (req, res) => {
  const { success, statusCode, body } = await usersControllers.deleteUser(req.params.id)

  res.status(statusCode).send({ success, statusCode, body })
})

usersRouter.put('/:id', async (req, res) => {
  const { success, statusCode, body } = await usersControllers.updateUser(req.params.id, req.body)

  res.status(statusCode).send({ success, statusCode, body })
})

export default usersRouter