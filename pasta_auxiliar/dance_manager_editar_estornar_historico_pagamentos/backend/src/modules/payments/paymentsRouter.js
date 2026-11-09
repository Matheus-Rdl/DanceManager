import express from "express";
import PaymentsControllers from "./paymentsControllers.js";

const paymentsRouter = express.Router();
const paymentsControllers = new PaymentsControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

paymentsRouter.get("/", async (req, res) => respond(res, await paymentsControllers.getPayments(req.query)));
paymentsRouter.post("/", async (req, res) => respond(res, await paymentsControllers.addPayment(req.body?.monthlyFeeId, req.body)));
/* Corrections preserve original values and justification in auditHistory.
   Edições preservam os valores anteriores e a justificativa no histórico. */
paymentsRouter.patch("/:paymentId", async (req, res) => respond(res, await paymentsControllers.changePayment(req.params.paymentId, req.body, "edited")));
/* Administrative reversal is not a real refund; no cash-out movement is created.
   Estorno administrativo não é devolução real e não gera saída de caixa. */
paymentsRouter.post("/:paymentId/reverse", async (req, res) => respond(res, await paymentsControllers.changePayment(req.params.paymentId, req.body, "reversed")));

export default paymentsRouter;
