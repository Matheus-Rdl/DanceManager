import express from "express";

import AttendanceControllers
  from "./attendancesControllers.js";


const attendanceRouter =
  express.Router();


const attendanceControllers =
  new AttendanceControllers();


/*
  Buscar chamada

  Exemplo:

  GET
  /attendance/000006/2026-09-22
*/

attendanceRouter.get(
  "/:activityMat/:date",
  async (req, res) => {

    const {
      activityMat,
      date
    } = req.params;


    const {
      success,
      statusCode,
      body
    } =
      await attendanceControllers.getAttendance(
        activityMat,
        date
      );


    res.status(statusCode).send({
      success,
      statusCode,
      body
    });

  }
);


/*
  Criar chamada
*/

attendanceRouter.post(
  "/",
  async (req, res) => {

    const {
      success,
      statusCode,
      body
    } =
      await attendanceControllers.addAttendance(
        req.body
      );


    res.status(statusCode).send({
      success,
      statusCode,
      body
    });

  }
);


/*
  Atualizar chamada
*/

attendanceRouter.put(
  "/:id",
  async (req, res) => {

    const {
      success,
      statusCode,
      body
    } =
      await attendanceControllers.updateAttendance(
        req.params.id,
        req.body
      );


    res.status(statusCode).send({
      success,
      statusCode,
      body
    });

  }
);


export default attendanceRouter;