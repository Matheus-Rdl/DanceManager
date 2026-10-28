import express from "express";
import PlansControllers from "./plansControllers.js";

const router = express.Router();
const controller = new PlansControllers();
const send = (res, result) => res.status(result.statusCode).json(result);

router.get("/", async (req, res) => send(res, await controller.listPlans()));
router.post("/", async (req, res) => send(res, await controller.createPlan(req.body)));
router.patch("/:id", async (req, res) => send(res, await controller.updatePlan(req.params.id, req.body)));
export default router;
