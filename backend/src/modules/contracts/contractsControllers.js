import crypto from "crypto";

import Contract from "../../models/Contract.js";


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