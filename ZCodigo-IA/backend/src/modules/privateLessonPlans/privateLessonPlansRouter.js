import express from "express";
import PrivateLessonPlan from "../../models/PrivateLessonPlan.js";
import { schoolId } from "../expenses/expenseRules.js";
import PrivateLessonPlansDataAccess from "./privateLessonPlansDataAccess.js";
import PrivateLessonPlansControllers from "./privateLessonPlansControllers.js";
import { privateLessonPlansAccessGate } from "./privateLessonPlansAccess.js";

const router = express.Router();
const controller = new PrivateLessonPlansControllers(new PrivateLessonPlansDataAccess({ model: PrivateLessonPlan, resolveSchoolId: schoolId }));
const respond = (res, result) => res.status(result.statusCode).send(result);

/* EN: All template operations are school-scoped; no hard-delete route is exposed.
   PT: Todas as operações são limitadas à escola; não há rota de exclusão definitiva. */
router.use(privateLessonPlansAccessGate);
router.get("/", async (req, res) => respond(res, await controller.list(req.query)));
router.get("/:id", async (req, res) => respond(res, await controller.get(req.params.id)));
router.post("/", async (req, res) => respond(res, await controller.create(req.body)));
router.patch("/:id", async (req, res) => respond(res, await controller.update(req.params.id, req.body)));
export default router;
