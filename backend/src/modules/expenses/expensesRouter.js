import express from "express";
import ExpensesControllers from "./expensesControllers.js";

const router = express.Router();
const controller = new ExpensesControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

/* Mantém as rotas e os formatos de resposta existentes. */
router.get("/", async (req, res) => respond(res, await controller.getExpenses(req.query)));
router.get("/recurrences", async (req, res) => respond(res, await controller.getRecurrences()));
router.post("/", async (req, res) => respond(res, await controller.addExpense(req.body || {})));
router.put("/:id", async (req, res) => respond(res, await controller.updateExpense(req.params.id, req.body || {})));
router.post("/:id/pay", async (req, res) => respond(res, await controller.payExpense(req.params.id, req.body || {})));
router.post("/:id/cancel", async (req, res) => respond(res, await controller.cancelExpense(req.params.id, req.body || {})));
router.post("/:id/zero", async (req, res) => respond(res, await controller.zeroExpense(req.params.id, req.body || {})));
router.delete("/:id", async (req, res) => respond(res, await controller.deleteExpense(req.params.id)));
router.post("/recurrences", async (req, res) => respond(res, await controller.addRecurrence(req.body || {})));
router.put("/recurrences/:id", async (req, res) => respond(res, await controller.updateRecurrence(req.params.id, req.body || {})));
router.post("/recurrences/:id/stop", async (req, res) => respond(res, await controller.stopRecurrence(req.params.id)));

export default router;
