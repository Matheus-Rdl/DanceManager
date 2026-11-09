import express from "express";
import RevenuesControllers from "./revenuesControllers.js";

const router = express.Router();
const controller = new RevenuesControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

router.get("/", async (req, res) => respond(res, await controller.list(req.query)));
router.post("/", async (req, res) => respond(res, await controller.create(req.body || {})));
router.put("/:id", async (req, res) => respond(res, await controller.update(req.params.id, req.body || {})));
router.post("/:id/receive", async (req, res) => respond(res, await controller.receive(req.params.id, req.body || {})));
router.post("/:id/cancel", async (req, res) => respond(res, await controller.cancel(req.params.id, req.body || {})));
router.delete("/:id", async (req, res) => respond(res, await controller.remove(req.params.id)));

export default router;
