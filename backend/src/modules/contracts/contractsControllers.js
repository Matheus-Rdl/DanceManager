import crypto from "crypto";

import Contract from "../../models/Contract.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import Payment from "../../models/Payment.js";




// ============================================================
// MENSALIDADES DO CONTRATO
// ============================================================
const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addMonthsSafe = (isoDate, months) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const lastDay = new Date(year, month + months, 0).getDate();
  return toISODate(new Date(year, month - 1 + months, Math.min(day, lastDay)));
};

/* Retorna o último dia do mês */
const getLastDayOfMonth = (reference) => {
  const [year, month] = reference.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

const buildMonthlyFees = (contract) => {
  const fees = [];
  const startDate = contract.startDate;
  const endDate = contract.plannedEndDate;

  if (!startDate) return fees;

  /* Contratos indeterminados geram inicialmente uma mensalidade */
  const maxInstallments = contract.indefinite || !endDate ? 1 : 120;

  for (let index = 0; index < maxInstallments; index += 1) {
    const periodStart = addMonthsSafe(startDate, index);
    if (endDate && periodStart > endDate) break;

    const nextPeriodStart = addMonthsSafe(startDate, index + 1);
    const next = new Date(`${nextPeriodStart}T12:00:00`);
    next.setDate(next.getDate() - 1);

    const reference = periodStart.slice(0, 7);
    const dueDate = getLastDayOfMonth(reference);
    const today = new Date().toISOString().split("T")[0];

    fees.push({
      id: crypto.randomUUID(),
      contractId: contract.id,
      userId: contract.userId,
      reference,
      number: index + 1,
      periodStart,
      periodEnd: toISODate(next),
      dueDate,
      amount: Number(contract.contractedValue || 0),
      paidAmount: 0,
      status: dueDate < today ? "overdue" : dueDate === today ? "pending" : "upcoming",
      createdAt: new Date().toISOString()
    });
  }

  return fees;
};

const recreateMonthlyFees = async (contract) => {
  await MonthlyFee.deleteMany({ contractId: contract.id });
  const fees = buildMonthlyFees(contract);
  if (fees.length) await MonthlyFee.insertMany(fees);
  return fees;
};

const contractHasPayments = async (contractId) => {
  return Boolean(await Payment.exists({ contractId }));
};

// ============================================================
// BUSCAR CONTRATOS DE UM USUÁRIO
// ============================================================

export const getContractsByUser = async (req, res) => {

  try {

    const {
      userId,
    } = req.params;


    const contracts =
      await Contract.find({
        userId,
      }).sort({
        createdAt: -1,
      });


    return res.status(200).json(
      contracts
    );


  } catch (error) {

    console.error(
      "Erro ao buscar contratos:",
      error
    );


    return res.status(500).json({

      ok: false,

      serverError:
        "Erro ao buscar contratos.",

    });

  }

};


// ============================================================
// CRIAR CONTRATO
// ============================================================

export const createContract = async (req, res) => {

  try {

    const {

      id,

      userId,

      contractType,

      plan,

      periodicity,

      baseValue,

      contractedValue,

      startDate,

      plannedEndDate,

      indefinite,

      specialCondition,

      active,

      createdAt,

      closedAt,

    } = req.body;


    // ========================================================
    // VALIDAR TIPO
    // ========================================================

    const validContractTypes = [
      "Plano",
      "Personalizado",
      "Bolsista",
    ];


    if (
      !validContractTypes.includes(
        contractType
      )
    ) {

      return res.status(400).json({

        ok: false,

        serverError:
          "Tipo de contrato inválido.",

      });

    }


    // ========================================================
    // VERIFICAR CONTRATO ATIVO
    // ========================================================

    const activeContract =
      await Contract.findOne({

        userId,

        active: true,

      });


    if (activeContract) {

      return res.status(409).json({

        ok: false,

        serverError:
          "O aluno já possui um contrato ativo.",

      });

    }


    // ========================================================
    // CRIAR
    // ========================================================

    const contract =
      await Contract.create({

        id:
          id ||
          crypto.randomUUID(),


        userId,


        // ----------------------------------------------------
        // TIPO
        // ----------------------------------------------------

        contractType,


        // ----------------------------------------------------
        // PLANO
        // ----------------------------------------------------

        plan:
          plan || null,


        periodicity:
          periodicity || null,


        // ----------------------------------------------------
        // VALORES
        // ----------------------------------------------------

        baseValue:
          Number(
            baseValue || 0
          ),


        contractedValue:
          Number(
            contractedValue || 0
          ),


        // ----------------------------------------------------
        // DATAS
        // ----------------------------------------------------

        startDate,


        plannedEndDate:
          plannedEndDate || null,


        indefinite:
          indefinite === true,


        // ----------------------------------------------------
        // CONDIÇÃO ESPECIAL
        // ----------------------------------------------------

        specialCondition:
          specialCondition || null,


        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        active:
          active !== undefined
            ? active
            : true,


        // ----------------------------------------------------
        // CRIAÇÃO
        // ----------------------------------------------------

        createdAt:
          createdAt ||
          new Date()
            .toISOString()
            .split("T")[0],


        // ----------------------------------------------------
        // ENCERRAMENTO
        // ----------------------------------------------------

        closedAt:
          closedAt || null,

      });

    try {
      await recreateMonthlyFees(contract);
    } catch (monthlyFeeError) {
      await Contract.deleteOne({ id: contract.id });
      throw monthlyFeeError;
    }


    return res.status(201).json({

      ok: true,

      contract,

    });


  } catch (error) {

    console.error(
      "Erro ao criar contrato:",
      error
    );


    return res.status(500).json({

      ok: false,

      serverError:
        "Erro ao criar contrato.",

    });

  }

};


// ============================================================
// EDITAR CONTRATO
// ============================================================

export const updateContract = async (req, res) => {

  try {

    const {
      id,
    } = req.params;


    const {

      contractType,

      plan,

      periodicity,

      baseValue,

      contractedValue,

      startDate,

      plannedEndDate,

      indefinite,

      specialCondition,

    } = req.body;


    // ========================================================
    // VALIDAR TIPO
    // ========================================================

    const validContractTypes = [
      "Plano",
      "Personalizado",
      "Bolsista",
    ];


    if (
      !validContractTypes.includes(
        contractType
      )
    ) {

      return res.status(400).json({

        ok: false,

        serverError:
          "Tipo de contrato inválido.",

      });

    }


    // ========================================================
    // BUSCAR CONTRATO
    // ========================================================

    const contract =
      await Contract.findOne({
        id,
      });


    if (!contract) {

      return res.status(404).json({

        ok: false,

        serverError:
          "Contrato não encontrado.",

      });

    }


    // ========================================================
    // CONTRATO ENCERRADO
    // ========================================================

    if (!contract.active) {

      return res.status(409).json({

        ok: false,

        serverError:
          "Não é possível editar um contrato encerrado.",

      });

    }


    // ========================================================
    // PROTEGER CONTRATO COM PAGAMENTO
    // ========================================================

    if (await contractHasPayments(id)) {
      return res.status(409).json({
        ok: false,
        serverError: "Este contrato possui pagamento registrado. Para preservar o histórico financeiro, não é possível alterar seus dados financeiros ou sua vigência.",
      });
    }


    // ========================================================
    // ATUALIZAR TIPO
    // ========================================================

    contract.contractType =
      contractType;


    // ========================================================
    // ATUALIZAR PLANO
    // ========================================================

    contract.plan =
      plan || null;


    contract.periodicity =
      periodicity || null;


    // ========================================================
    // ATUALIZAR VALORES
    // ========================================================

    contract.baseValue =
      Number(
        baseValue || 0
      );


    contract.contractedValue =
      Number(
        contractedValue || 0
      );


    // ========================================================
    // ATUALIZAR DATAS
    // ========================================================

    contract.startDate =
      startDate;


    contract.plannedEndDate =
      plannedEndDate || null;


    contract.indefinite =
      indefinite === true;


    // ========================================================
    // CONDIÇÃO ESPECIAL
    // ========================================================

    contract.specialCondition =
      specialCondition || null;


    // ========================================================
    // SALVAR
    // ========================================================

    await contract.save();
    await recreateMonthlyFees(contract);


    return res.status(200).json({

      ok: true,

      contract,

    });


  } catch (error) {

    console.error(
      "Erro ao editar contrato:",
      error
    );


    return res.status(500).json({

      ok: false,

      serverError:
        "Erro ao editar contrato.",

    });

  }

};


// ============================================================
// ENCERRAR CONTRATO
// ============================================================

export const closeContract = async (req, res) => {

  try {

    const {
      id,
    } = req.params;


    // ========================================================
    // BUSCAR
    // ========================================================

    const contract =
      await Contract.findOne({
        id,
      });


    if (!contract) {

      return res.status(404).json({

        ok: false,

        serverError:
          "Contrato não encontrado.",

      });

    }


    // ========================================================
    // JÁ ENCERRADO
    // ========================================================

    if (!contract.active) {

      return res.status(409).json({

        ok: false,

        serverError:
          "Este contrato já está encerrado.",

      });

    }


    // ========================================================
    // DATA DE ENCERRAMENTO
    // ========================================================

    const today =
      new Date()
        .toISOString()
        .split("T")[0];


    // ========================================================
    // ENCERRAR
    // ========================================================

    contract.active = false;

    contract.closedAt =
      today;


    await contract.save();


    return res.status(200).json({

      ok: true,

      contract,

    });


  } catch (error) {

    console.error(
      "Erro ao encerrar contrato:",
      error
    );


    return res.status(500).json({

      ok: false,

      serverError:
        "Erro ao encerrar contrato.",

    });

  }

};

// ============================================================
// EXCLUIR CONTRATO
// Só é permitido quando não existe nenhum pagamento.
// ============================================================
export const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findOne({ id });
    if (!contract) return res.status(404).json({ ok: false, serverError: "Contrato não encontrado." });

    if (await contractHasPayments(id)) {
      return res.status(409).json({
        ok: false,
        serverError: "Não é possível excluir este contrato porque já existe pagamento registrado.",
      });
    }

    await MonthlyFee.deleteMany({ contractId: id });
    await Contract.deleteOne({ id });
    return res.status(200).json({ ok: true, deletedId: id });
  } catch (error) {
    console.error("Erro ao excluir contrato:", error);
    return res.status(500).json({ ok: false, serverError: "Erro ao excluir contrato." });
  }
};
