import express from "express";
import PrivateLessonPackage from "../../models/PrivateLessonPackage.js";
import PrivateLessonPlan from "../../models/PrivateLessonPlan.js";
import User from "../../models/User.js";
import { schoolId } from "../expenses/expenseRules.js";
import PrivateLessonPackagesDataAccess from "./privateLessonPackagesDataAccess.js";
import PrivateLessonPackagesControllers from "./privateLessonPackagesControllers.js";
import { privateLessonPackagesAccessGate } from "./privateLessonPackagesAccess.js";

const router = express.Router();
const controller = new PrivateLessonPackagesControllers(new PrivateLessonPackagesDataAccess({
  model: PrivateLessonPackage, planModel: PrivateLessonPlan, userModel: User, resolveSchoolId: schoolId
}));

/* EN: Only creation is exposed in this commit; read and edit routes follow separately.
   PT: Apenas a criação é exposta neste commit; consultas e edição vêm em etapa separada. */
router.use(privateLessonPackagesAccessGate);
router.post("/", async (req, res) => {
  const result = await controller.create(req.body);
  return res.status(result.statusCode).send(result);
});
export default router;
