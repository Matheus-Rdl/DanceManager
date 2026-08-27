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

usersRouter.get('/type', async (req, res) => {
  const { types } = req.query;

  const { success, statusCode, body } =
    await usersControllers.getUsersByType(types);

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