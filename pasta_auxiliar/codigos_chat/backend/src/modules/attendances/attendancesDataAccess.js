import Attendance from "../../models/Attendance.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export default class AttendanceDataAccess {

  // Busca a chamada de uma atividade em uma data específica
  async getAttendance(activityMat, date) {

    const attendance = await Attendance.findOne({
      activityMat: String(activityMat),
      date: date
    }).lean();
    if (!attendance) return null;

    /* Complementa somente a resposta: os registros de presença não são alterados.
       Permite visualizar nomes de alunos que já saíram da turma. */
    const ids = (attendance.students || []).map(student => String(student.userId))
      .filter(id => mongoose.isValidObjectId(id));
    const users = ids.length ? await User.find({ _id: { $in: ids } })
      .select("user_name user_mat user_situation").lean() : [];
    attendance.studentLookup = Object.fromEntries(users.map(user => [String(user._id), {
      name: user.user_name, mat: user.user_mat, situation: user.user_situation
    }]));
    return attendance;

  }


  // Cria uma nova chamada
  async addAttendance(attendanceData) {

    return await Attendance.findOneAndUpdate(

      {
        activityMat:
          attendanceData.activityMat,

        date:
          attendanceData.date,
      },

      {
        $set: {

          students:
            attendanceData.students,

          updatedAt:
            attendanceData.updatedAt,

        },

        $setOnInsert: {

          id:
            attendanceData.id,

          activityMat:
            attendanceData.activityMat,

          date:
            attendanceData.date,

          createdAt:
            attendanceData.createdAt,

        },

      },

      {
        new: true,

        upsert: true,

        runValidators: true,
      }

    );

  }


  // Atualiza uma chamada existente
  async updateAttendance(id, attendanceData) {

    return await Attendance.findByIdAndUpdate(
      id,
      {
        $set: attendanceData
      },
      {
        new: true,
        runValidators: true
      }
    );

  }

}