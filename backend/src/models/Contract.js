import mongoose from "mongoose";

const contractSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: String,
      required: true,
    },

    plan: {
      type: String,
      required: true,
    },

    periodicity: {
      type: String,
      required: true,
    },

    baseValue: {
      type: Number,
      required: true,
    },

    contractedValue: {
      type: Number,
      required: true,
    },

    startDate: {
      type: String,
      required: true,
    },

    endDate: {
      type: String,
      required: true,
    },

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

    active: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      type: String,
      required: true,
    },

    closedAt: {
      type: String,
      default: null,
    },
  },
  {
    collection: "contracts",
  }
);

export default mongoose.model("Contract", contractSchema);