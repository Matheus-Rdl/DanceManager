import { useRef, useState } from "react";

export default function attendancesServices() {

  const [attendanceList, setAttendanceList] =
    useState(null);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [refetchAttendance, setRefetchAttendance] =
    useState(true);


  const url =
    `${import.meta.env.VITE_API_URL}/attendances`;
  /* Evita que a resposta de outra semana sobrescreva a chamada atual. */
  const requestVersion = useRef(0);


  /*
    -------------------------------------------------------
    BUSCAR PRESENÇAS
    -------------------------------------------------------

    Busca as presenças de uma atividade
    em uma determinada data.
  */

  const getAttendance = async (activityMat, date) => {
    const version = ++requestVersion.current;
    setAttendanceLoading(true);
    setAttendanceList(null);
    try {
      const response = await fetch(`${url}/${encodeURIComponent(activityMat)}/${encodeURIComponent(date)}`);
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.body || "Erro ao buscar presenças.");
      if (version === requestVersion.current) setAttendanceList(result.body || null);
      return result.body || null;
    } catch (error) {
      if (version === requestVersion.current) setAttendanceList(null);
      console.error("Erro ao buscar presenças:", error);
      throw error;
    } finally {
      if (version === requestVersion.current) {
        setAttendanceLoading(false);
        setRefetchAttendance(false);
      }
    }
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

      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(typeof result.body === "string" ? result.body : "Não foi possível salvar a chamada.");
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