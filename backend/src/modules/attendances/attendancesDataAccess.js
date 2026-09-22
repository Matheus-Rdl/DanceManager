import Attendance from "../../models/Attendance.js";

export default class AttendanceDataAccess {

  // Busca a chamada de uma atividade em uma data específica
  async getAttendance(activityMat, date) {

    return await Attendance.findOne({
      activityMat: String(activityMat),
      date: date
    }).lean();

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