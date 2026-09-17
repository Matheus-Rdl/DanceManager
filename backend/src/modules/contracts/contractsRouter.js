import express from "express";

import {
  getContractsByUser,
  createContract,
  updateContract,
  closeContract,
} from "./contractsControllers.js";


const router =
  express.Router();


// ============================================================
// BUSCAR CONTRATOS DO USUÁRIO
// GET /contracts/user/:userId
// ============================================================

router.get(
  "/user/:userId",
  getContractsByUser
);


// ============================================================
// CRIAR CONTRATO
// POST /contracts
// ============================================================

router.post(
  "/",
  createContract
);


// ============================================================
// EDITAR CONTRATO
// PATCH /contracts/:id
// ============================================================

router.patch(
  "/:id",
  updateContract
);


// ============================================================
// ENCERRAR CONTRATO
// PATCH /contracts/:id/close
// ============================================================

router.patch(
  "/:id/close",
  closeContract
);


export default router;