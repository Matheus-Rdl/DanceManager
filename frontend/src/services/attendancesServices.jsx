import { useState } from "react";

export default function attendancesServices() {

  const [attendanceList, setAttendanceList] =
    useState(null);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [refetchAttendance, setRefetchAttendance] =
    useState(true);


  const url =
    `${import.meta.env.VITE_API_URL}/attendances`;


  /*
    -------------------------------------------------------
    BUSCAR PRESENÇAS
    -------------------------------------------------------

    Busca as presenças de uma atividade
    em uma determinada data.
  */

  const getAttendance = (
    activityMat,
    date
  ) => {

    /*
    console.log(
      "BUSCANDO CHAMADA:",
      {
        activityMat,
        date,
      }
    );
    */

    setAttendanceLoading(true);

    fetch(
      `${url}/${activityMat}/${date}`,
      {
        method: "GET",

        headers: {
          "Content-Type":
            "application/json",
        },
      }
    )

      .then((response) =>
        response.json()
      )

      .then((result) => {

        /*
          console.log(
            "RESPOSTA DA CHAMADA:",
            result
          );
        */

        if (result.success) {

          setAttendanceList(
            result.body || null
          );

        } else {

          setAttendanceList(null);

          console.log(result);

        }

      })

      .catch((error) => {

        console.log(
          "Erro ao buscar presenças:",
          error
        );

      })

      .finally(() => {

        setAttendanceLoading(false);

        setRefetchAttendance(false);

      });

  };


  /*
    -------------------------------------------------------
    SALVAR PRESENÇA
    -------------------------------------------------------

    Cria ou atualiza a presença de um aluno.
  */

  const saveAttendance = (
    attendanceData
  ) => {

    return fetch(
      `${url}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            attendanceData
          ),
      }
    )

      .then((response) =>
        response.json()
      )

      .then((result) => {

        if (!result.success) {

          console.log(result);

        }

        return result;

      })

      .catch((error) => {

        console.log(
          "Erro ao salvar presença:",
          error
        );

        throw error;

      });

  };


  return {

    getAttendance,
    saveAttendance,

    attendanceList,
    attendanceLoading,
    refetchAttendance,

  };

}