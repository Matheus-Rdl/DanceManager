import express from "express";
import FinancialTransfersControllers from "./financialTransfersControllers.js";

const router = express.Router();
const controller = new FinancialTransfersControllers();
const respond = (res, result) => res.status(result.statusCode).send(result);

/* EN: Financial history exposes sensitive data; all endpoints fail closed in production
       until the backend has trusted authentication and authorization middleware.
   PT: O histórico contém dados sensíveis; todas as rotas ficam bloqueadas em produção
       até existir autenticação e autorização confiáveis no backend. */
const productionBlocked = (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).send({ success: false, statusCode: 403,
      body: "Transferências indisponíveis em produção sem autenticação e autorização." });
  }
  return next();
};

router.use(productionBlocked);

/* EN: Register list before the parameterized detail route.
   PT: Registra a listagem antes da rota parametrizada de detalhes. */
router.get("/", async (req, res) => respond(res, await controller.list(req.query || {})));
router.get("/:id", async (req, res) => respond(res, await controller.getById(req.params.id)));
router.post("/", async (req, res) => respond(res, await controller.create(req.body || {})));
router.post("/:id/reverse", async (req, res) =>
  respond(res, await controller.reverse(req.params.id, req.body || {})));

export default router;
