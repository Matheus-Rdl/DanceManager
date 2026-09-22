import AttendanceDataAccess from "./attendancesDataAccess.js";

import {
  ok,
  serverError
} from "../../helpers/httpResponse.js";


export default class AttendanceControllers {

  constructor() {

    this.dataAccess =
      new AttendanceDataAccess();

  }


  // Buscar chamada
  async getAttendance(
    activityMat,
    date
  ) {

    try {

      const attendance =
        await this.dataAccess.getAttendance(
          activityMat,
          date
        );

      return ok(attendance);

    } catch (error) {

      return serverError(error);

    }

  }


  // Criar chamada
  async addAttendance(
    attendanceData
  ) {

    try {

      const attendance =
        await this.dataAccess.addAttendance(
          attendanceData
        );

      return ok(attendance);

    } catch (error) {

      return serverError(error);

    }

  }


  // Atualizar chamada
  async updateAttendance(
    id,
    attendanceData
  ) {

    try {

      const attendance =
        await this.dataAccess.updateAttendance(
          id,
          attendanceData
        );

      return ok(attendance);

    } catch (error) {

      return serverError(error);

    }

  }

}