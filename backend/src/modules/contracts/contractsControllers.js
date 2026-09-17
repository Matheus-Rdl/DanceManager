import Contract from "../../models/Contract.js";

// ============================================================
// BUSCAR CONTRATOS DE UM USUÁRIO
// ============================================================

export const getContractsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const contracts = await Contract.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json(contracts);

  } catch (error) {

    console.error(
      "Erro ao buscar contratos:",
      error
    );

    return res.status(500).json({
      ok: false,
      serverError: "Erro ao buscar contratos.",
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
      plan,
      periodicity,
      baseValue,
      contractedValue,
      startDate,
      endDate,
      specialCondition,
      active,
      createdAt,
      closedAt,
    } = req.body;


    // ========================================================
    // VERIFICAR SE JÁ EXISTE CONTRATO ATIVO
    // ========================================================

    const activeContract = await Contract.findOne({
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

    const contract = await Contract.create({

      id:
        id ||
        crypto.randomUUID(),

      userId,

      plan,

      periodicity,

      baseValue:

        Number(
          baseValue || 0
        ),

      contractedValue:

        Number(
          contractedValue || 0
        ),

      startDate,

      endDate,

      specialCondition:
        specialCondition || null,

      active:
        active !== undefined
          ? active
          : true,

      createdAt:
        createdAt ||
        new Date()
          .toISOString()
          .split("T")[0],

      closedAt:
        closedAt || null,
    });


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

    const { id } = req.params;

    const {
      plan,
      periodicity,
      baseValue,
      contractedValue,
      startDate,
      endDate,
      specialCondition,
    } = req.body;


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
    // ATUALIZAR
    // ========================================================

    contract.plan =
      plan;

    contract.periodicity =
      periodicity;

    contract.baseValue =
      Number(baseValue || 0);

    contract.contractedValue =
      Number(contractedValue || 0);

    contract.startDate =
      startDate;

    contract.endDate =
      endDate;

    contract.specialCondition =
      specialCondition || null;


    await contract.save();


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

    const { id } = req.params;


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