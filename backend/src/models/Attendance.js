import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },

    activityMat: {
      type: String,
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    students: [
      {
        userId: {
          type: String,
          required: true,
        },

        status: {
          type: String,
          enum: [
            "undefined",
            "present",
            "absent",
          ],
          default: "undefined",
        },
      },
    ],

    createdAt: {
      type: String,
      required: true,
    },

    updatedAt: {
      type: String,
      required: true,
    },
  },
  {
    collection: "attendances",
  }
);

export default mongoose.model(
  "Attendance",
  attendanceSchema
);