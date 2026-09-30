import mongoose from "mongoose";


// ============================================================
// SCHEMA DE CONTRATO
// ============================================================

const contractSchema = new mongoose.Schema(
  {

    // ==========================================================
    // ID DO CONTRATO
    // ==========================================================

    id: {
      type: String,
      required: true,
      unique: true,
    },


    // ==========================================================
    // USUÁRIO
    // ==========================================================

    userId: {
      type: String,
      required: true,
    },


    // ==========================================================
    // TIPO DE CONTRATO
    //
    // NOVOS CONTRATOS:
    //
    // Plano
    // Personalizado
    // Bolsista
    //
    // Contratos antigos não possuem esse campo.
    // Nesse caso o frontend considera como "Plano".
    // ==========================================================

    contractType: {
      type: String,
      enum: [
        "Plano",
        "Personalizado",
        "Bolsista",
      ],
      required: true,
    },


    // ==========================================================
    // PLANO
    //
    // Para contratos personalizados e bolsistas,
    // esse campo pode ser null.
    //
    // Mantemos o campo para não quebrar os contratos antigos.
    // ==========================================================

    plan: {
      type: String,
      default: null,
    },


    // ==========================================================
    // PERIODICIDADE / DURAÇÃO DO PLANO
    //
    // Usada principalmente para contratos do tipo "Plano".
    //
    // Personalizado e Bolsista podem ficar sem periodicidade.
    // ==========================================================

    periodicity: {
      type: String,
      default: null,
    },


    // ==========================================================
    // VALOR BASE
    //
    // No contrato de plano:
    //
    // baseValue = preço oficial do plano
    //
    // No personalizado:
    //
    // baseValue = 0
    //
    // No bolsista:
    //
    // baseValue = 0
    //
    // O campo continua existindo para compatibilidade.
    // ==========================================================

    baseValue: {
      type: Number,
      default: 0,
    },


    // ==========================================================
    // VALOR CONTRATADO
    //
    // Esse é o valor mensal efetivamente cobrado.
    //
    // Exemplos:
    //
    // Plano Balanço -> 240
    // Personalizado -> 200
    // Bolsista -> 0
    // ==========================================================

    contractedValue: {
      type: Number,
      required: true,
    },


    // ==========================================================
    // DATA DE INÍCIO
    // ==========================================================

    startDate: {
      type: String,
      required: true,
    },


    // ==========================================================
    // FIM PREVISTO
    //
    // Para planos:
    // calculado automaticamente.
    //
    // Para personalizado/bolsista:
    // definido manualmente.
    //
    // Pode ser null quando o contrato for
    // por prazo indeterminado.
    //
    // IMPORTANTE:
    // Antes era required: true.
    // Agora não é mais obrigatório para permitir
    // contratos indeterminados.
    // ==========================================================

    plannedEndDate: {
      type: String,
      default: null,
    },


    // ==========================================================
    // PRAZO INDETERMINADO
    //
    // true:
    // não existe uma data prevista para encerramento.
    //
    // false:
    // existe plannedEndDate.
    //
    // O default false mantém compatibilidade com
    // contratos antigos.
    // ==========================================================

    indefinite: {
      type: Boolean,
      default: false,
    },


    // ==========================================================
    // CONDIÇÃO ESPECIAL
    //
    // Mantido para compatibilidade com os contratos antigos.
    //
    // Contratos antigos podem ter:
    //
    // {
    //   type: "Valor personalizado"
    // }
    //
    // ou:
    //
    // {
    //   type: "Bolsa"
    // }
    //
    // Os novos contratos utilizam principalmente
    // contractType.
    // ==========================================================

    specialCondition: {

      type: {
        type: String,
        default: null,
      },

      customValue: {
        type: Number,
        default: null,
      },

      scholarshipPercentage: {
        type: Number,
        default: null,
      },

    },


    // ==========================================================
    // STATUS
    // ==========================================================

    active: {
      type: Boolean,
      default: true,
    },


    // ==========================================================
    // DATA DE CRIAÇÃO
    // ==========================================================

    createdAt: {
      type: String,
      required: true,
    },


    // ==========================================================
    // FIM DEFINITIVO
    //
    // Preenchido quando o contrato é encerrado.
    //
    // Exemplo:
    //
    // plannedEndDate:
    // 2027-03-31
    //
    // closedAt:
    // 2027-02-15T21:30:00.000Z
    //
    // Dessa forma conseguimos distinguir:
    //
    // Fim previsto
    // x
    // Fim efetivamente ocorrido
    // ==========================================================

    closedAt: {
      type: String,
      default: null,
    },

  },


  {
    collection: "contracts",
  }

);


// ============================================================
// EXPORT
// ============================================================

export default mongoose.model(
  "Contract",
  contractSchema
);