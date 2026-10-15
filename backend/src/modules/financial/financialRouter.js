import express from "express";
import FinancialControllers from "./financialControllers.js";

const router = express.Router();
const controller = new FinancialControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

router.get("/summary", async (req, res) => respond(res, await controller.getSummary(req.query)));
router.get("/period-summary", async (req, res) => respond(res, await controller.getPeriodSummary(req.query)));
router.get("/timeline", async (req, res) => respond(res, await controller.getTimeline(req.query)));
router.get("/receipts", async (req, res) => respond(res, await controller.getReceipts(req.query)));

export default router;
