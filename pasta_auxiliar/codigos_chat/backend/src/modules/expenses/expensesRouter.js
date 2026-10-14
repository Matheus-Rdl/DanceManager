import express from "express";
import ExpensesDataAccess from "./expensesDataAccess.js";

const router = express.Router();
const data = new ExpensesDataAccess();
const handle = callback => async (req, res) => {
  try {
    const result = await callback(req);
    return res.status(200).json({ success: true, statusCode: 200, body: result });
  } catch (error) {
    console.error("[Despesas]", error);
    const code = error.statusCode || 500;
    return res.status(code).json({ success: false, statusCode: code, body: code === 500 ? "Erro interno ao processar despesas." : error.message });
  }
};
router.get("/", handle(req => data.list(req.query)));
router.get("/recurrences", handle(() => data.listRecurrences()));
router.post("/", handle(req => data.create(req.body || {})));
router.put("/:id", handle(req => data.update(req.params.id, req.body || {})));
router.post("/:id/pay", handle(req => data.pay(req.params.id, req.body || {})));
router.post("/:id/cancel", handle(req => data.cancel(req.params.id)));
router.post("/recurrences", handle(req => data.createRecurrence(req.body || {})));
router.put("/recurrences/:id", handle(req => data.updateRecurrence(req.params.id, req.body || {})));
router.post("/recurrences/:id/stop", handle(req => data.stopRecurrence(req.params.id)));
export default router;
