import express from "express";
import FinancialTransfersControllers from "./financialTransfersControllers.js";

const router = express.Router();
const controller = new FinancialTransfersControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

/* EN: Only the creation endpoint belongs to Commit 11. History/reversals follow separately.
   PT: O Commit 11 adiciona apenas a criação. Histórico/estorno serão etapas separadas. */
/* EN: No trusted login/permission middleware exists in this backend yet.
       Fail closed in production until financial write authorization is implemented.
   PT: Este backend ainda não tem middleware confiável de login/permissões.
       Bloqueia gravações em produção até implementar autorização financeira. */
router.post("/", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).send({ success: false, statusCode: 403,
      body: "Transferências indisponíveis em produção sem autenticação e autorização." });
  }
  return respond(res, await controller.create(req.body || {}));
});

export default router;
