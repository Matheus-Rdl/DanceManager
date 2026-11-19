import express from "express";
import FinancialAccountsControllers from "./financialAccountsControllers.js";

const router = express.Router();
const controller = new FinancialAccountsControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

/* EN: Account management only; payments, balances and transfers belong to later commits.
   PT: Apenas gestão das contas; pagamentos, saldos e transferências ficam para os próximos commits. */
router.get("/", async (req, res) => respond(res, await controller.list(req.query)));
router.get("/:id", async (req, res) => respond(res, await controller.get(req.params.id)));
router.post("/", async (req, res) => respond(res, await controller.create(req.body || {})));
router.patch("/:id", async (req, res) => respond(res, await controller.update(req.params.id, req.body || {})));

export default router;
