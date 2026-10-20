import express from "express";
import FieldOptionsControllers from "./fieldOptionsControllers.js";

const fieldOptionsRouter = express.Router();
const fieldOptionsControllers = new FieldOptionsControllers();

/* Consulta todas as listas estáticas de opções. */
fieldOptionsRouter.get("/catalog", async (req, res) => {
  const { success, statusCode, body } = await fieldOptionsControllers.getCatalog();
  res.status(statusCode).send({ success, statusCode, body });
});

/* Consulta as opções e permissões de um campo tipo 2 ou 3. */
fieldOptionsRouter.get("/:fieldId", async (req, res) => {
  const { success, statusCode, body } = await fieldOptionsControllers.getFieldOptions(req.params.fieldId);
  res.status(statusCode).send({ success, statusCode, body });
});

/* Adiciona, renomeia, reordena ou ativa/desativa opções autorizadas. */
fieldOptionsRouter.patch("/:fieldId", async (req, res) => {
  const { success, statusCode, body } = await fieldOptionsControllers.mutateOptions(req.params.fieldId, req.body);
  res.status(statusCode).send({ success, statusCode, body });
});

export default fieldOptionsRouter;
