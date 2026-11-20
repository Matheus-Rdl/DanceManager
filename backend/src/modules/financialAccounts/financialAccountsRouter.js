import express from "express";
import FinancialAccountsControllers from "./financialAccountsControllers.js";

const router = express.Router();
const controller = new FinancialAccountsControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

/* EN: The balances endpoint is registered before /:id, to avoid interpreting "balances" as an account ID.
   PT: A rota de saldos vem antes de /:id, evitando interpretar "balances" como ID de conta. */
router.get("/balances", async (req, res) => respond(res, await controller.balances(req.query)));
router.get("/", async (req, res) => respond(res, await controller.list(req.query)));
router.get("/:id", async (req, res) => respond(res, await controller.get(req.params.id)));
router.post("/", async (req, res) => respond(res, await controller.create(req.body || {})));
router.patch("/:id", async (req, res) => respond(res, await controller.update(req.params.id, req.body || {})));

export default router;
