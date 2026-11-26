import express from "express";
import PrivateLessonPackage from "../../models/PrivateLessonPackage.js";
import PrivateLessonPlan from "../../models/PrivateLessonPlan.js";
import User from "../../models/User.js";
import FinancialAccount from "../../models/FinancialAccount.js";
import PrivateLessonPaymentsDataAccess from "../privateLessonPayments/privateLessonPaymentsDataAccess.js";
import { schoolId } from "../expenses/expenseRules.js";
import PrivateLessonPackagesDataAccess from "./privateLessonPackagesDataAccess.js";
import PrivateLessonPackagesControllers from "./privateLessonPackagesControllers.js";
import { privateLessonPackagesAccessGate } from "./privateLessonPackagesAccess.js";

const router = express.Router();
const controller = new PrivateLessonPackagesControllers(new PrivateLessonPackagesDataAccess({
  model: PrivateLessonPackage, planModel: PrivateLessonPlan, userModel: User, resolveSchoolId: schoolId
}));

/* EN: All routes use the existing access gate; no hard-delete or lifecycle change is exposed.
   PT: Todas as rotas usam o bloqueio de acesso existente; não há exclusão definitiva ou mudança de situação. */
const paymentAccess = new PrivateLessonPaymentsDataAccess({ packageModel: PrivateLessonPackage, accountModel: FinancialAccount, resolveSchoolId: schoolId });
const respond = (res, result) => res.status(result.statusCode).send(result);
router.use(privateLessonPackagesAccessGate);
router.get("/", async (req, res) => respond(res, await controller.list(req.query)));
router.get("/participants", async (req, res) => respond(res, await controller.listParticipants()));
/* EN: Read only until the matching revenue is integrated.
   PT: Somente leitura até integrar o provento correspondente. */
router.get("/:id/payments", async (req, res) => respond(res, await controller.execute(() => paymentAccess.get(req.params.id))));
router.get("/:id", async (req, res) => respond(res, await controller.get(req.params.id)));
router.post("/", async (req, res) => respond(res, await controller.create(req.body)));
router.patch("/:id", async (req, res) => respond(res, await controller.update(req.params.id, req.body)));
export default router;
