import express from "express";
import DashboardControllers from "./dashboardControllers.js";

const router = express.Router();
const controller = new DashboardControllers();
router.get("/summary", async (_req, res) => {
  const result = await controller.getSummary();
  res.status(result.statusCode).json(result);
});
export default router;
