
import express from "express";
import MonthlyFeesControllers from "./monthlyFeesControllers.js";

const monthlyFeesRouter = express.Router();
const monthlyFeesControllers = new MonthlyFeesControllers();

/* Buscar todas as mensalidades, com filtros opcionais */
monthlyFeesRouter.get("/", async (req, res) => {
  const { success, statusCode, body } =
    await monthlyFeesControllers.getMonthlyFees(req.query);

  res.status(statusCode).send({ success, statusCode, body });
});

/* Buscar mensalidade específica */
monthlyFeesRouter.get("/:id", async (req, res) => {
  const { success, statusCode, body } =
    await monthlyFeesControllers.getMonthlyFee(req.params.id);

  res.status(statusCode).send({ success, statusCode, body });
});

export default monthlyFeesRouter;
