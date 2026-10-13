import express from "express";
import PaymentsControllers from "./paymentsControllers.js";

const paymentsRouter = express.Router();
const paymentsControllers = new PaymentsControllers();

/* GET /payments?userId=... ou ?monthlyFeeId=... */
paymentsRouter.get("/", async (req, res) => {
  const { success, statusCode, body } = await paymentsControllers.getPayments(req.query);
  res.status(statusCode).send({ success, statusCode, body });
});

/* POST /payments: body = { monthlyFeeId, amount, method, paidAt, receipt } */
paymentsRouter.post("/", async (req, res) => {
  const { success, statusCode, body } = await paymentsControllers.addPayment(req.body?.monthlyFeeId, req.body);
  res.status(statusCode).send({ success, statusCode, body });
});

export default paymentsRouter;
