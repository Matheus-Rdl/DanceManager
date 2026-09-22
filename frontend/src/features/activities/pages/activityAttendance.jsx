/*
    Type: Page
    Name: ActivityAttendance
    Description:
      Tela responsável pelo controle de presenças das turmas.
      Exibe a semana atual e destaca a aula do dia ou a próxima aula.
      Os alunos são carregados através da atividade.
      As presenças são salvas automaticamente no LocalStorage.
*/

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  VStack,
  Text,
  Table,
  Dialog,
  Portal,
  Grid,
} from "@chakra-ui/react";

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// React Icons
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaCalendarAlt,
  FaClock,
  FaUser,
} from "react-icons/fa";

import HeadingPage from "../../../components/headingPage";
import usersServices from "../../../services/usersServices";


export default function ActivityAttendance() {

  /*
    -------------------------------------------------------
    NAVEGAÇÃO
    -------------------------------------------------------
  */

  const location = useLocation();
  const navigate = useNavigate();


  /*
    -------------------------------------------------------
    SERVICE DE USUÁRIOS
    -------------------------------------------------------

    Os alunos são buscados através da atividade.

    A presença NÃO é buscada do banco.
  */

  const {
    getUsersByActivity,
    userListActivies,
    refetchUsers,
  } = usersServices();


  /*
    -------------------------------------------------------
    DADOS DA ATIVIDADE
    -------------------------------------------------------
  */

  const activityData =
    location.state?.activityData;


  /*
    -------------------------------------------------------
    BUSCAR ALUNOS DA ATIVIDADE
    -------------------------------------------------------

    Utiliza o mesmo método usado na tela
    ActivityManagementUsers.

    Neste momento estamos buscando somente
    os alunos vinculados à atividade.
  */

  useEffect(() => {

    if (
      refetchUsers &&
      activityData?.activity_mat
    ) {

      getUsersByActivity(
        activityData.activity_mat
      );

    }

  }, [
    refetchUsers,
    activityData,
  ]);


  /*
    -------------------------------------------------------
    DATA ATUAL
    -------------------------------------------------------
  */

  const today = new Date();


  /*
    -------------------------------------------------------
    DIAS DA SEMANA
    -------------------------------------------------------
  */

  const weekDayNames = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];


  /*
    -------------------------------------------------------
    MESES
    -------------------------------------------------------
  */

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];


  /*
    -------------------------------------------------------
    DADOS REAIS DA ATIVIDADE
    -------------------------------------------------------
  */

  const activityWeekDay =
    Number(
      activityData?.activity_days
    );

  const activityWeekDayName =
    weekDayNames[
      activityWeekDay
    ];

  const activityTimeStart =
    activityData?.activity_time_start;

  const activityTimeEnd =
    activityData?.activity_time_end;


  /*
    -------------------------------------------------------
    ALUNOS
    -------------------------------------------------------

    Os alunos vêm do backend através de:

      userListActivies

    A presença continua sendo controlada
    somente pelo estado local + LocalStorage.
  */

  const [students, setStudents] =
    useState([]);


  /*
    -------------------------------------------------------
    TRANSFORMAR USUÁRIOS EM ALUNOS DA CHAMADA
    -------------------------------------------------------

    userListActivies possui os usuários vindos
    do backend.

    Aqui transformamos os dados para o formato
    utilizado pela tela de presença.

    Não fazemos nenhuma alteração no banco.
  */

  useEffect(() => {

    if (!userListActivies) {
      return;
    }

    setStudents(
      userListActivies.map(
        (user) => ({
          id: user._id,
          name: user.user_name,
          status: "undefined",
        })
      )
    );

  }, [
    userListActivies,
  ]);


  /*
    -------------------------------------------------------
    FUNÇÃO: INÍCIO DA SEMANA
    -------------------------------------------------------
  */

  const getStartOfWeek = (
    date
  ) => {

    const result =
      new Date(date);

    const day =
      result.getDay();

    const difference =
      day === 0
        ? -6
        : 1 - day;

    result.setDate(
      result.getDate() +
      difference
    );

    result.setHours(
      0,
      0,
      0,
      0
    );

    return result;
  };


  /*
    -------------------------------------------------------
    FUNÇÃO: FINAL DA SEMANA
    -------------------------------------------------------
  */

  const getEndOfWeek = (
    date
  ) => {

    const result =
      getStartOfWeek(date);

    result.setDate(
      result.getDate() +
      6
    );

    return result;
  };


  /*
    -------------------------------------------------------
    SEMANA SELECIONADA
    -------------------------------------------------------
  */

  const [
    selectedWeek,
    setSelectedWeek
  ] = useState(
    getStartOfWeek(today)
  );


  /*
    -------------------------------------------------------
    DIALOGS
    -------------------------------------------------------
  */

  const [
    yearDialogOpen,
    setYearDialogOpen
  ] = useState(false);

  const [
    monthDialogOpen,
    setMonthDialogOpen
  ] = useState(false);


  /*
    -------------------------------------------------------
    CONTROLE DE EDIÇÃO DE AULA ANTIGA
    -------------------------------------------------------
  */

  const [
    canEditPastClass,
    setCanEditPastClass
  ] = useState(false);


  /*
    -------------------------------------------------------
    FUNÇÃO: DATA DA AULA NA SEMANA
    -------------------------------------------------------
  */

  const getActivityDate = (
    weekStart
  ) => {

    const result =
      new Date(weekStart);

    const dayOffset =
      activityWeekDay === 0
        ? 6
        : activityWeekDay - 1;

    result.setDate(
      result.getDate() +
      dayOffset
    );

    return result;
  };


  /*
    -------------------------------------------------------
    DATA DA AULA
    -------------------------------------------------------
  */

  const activityDate =
    getActivityDate(
      selectedWeek
    );


  /*
    -------------------------------------------------------
    COMPARAR DATAS
    -------------------------------------------------------
  */

  const isSameDate = (
    dateA,
    dateB
  ) => {

    return (
      dateA.getFullYear() ===
      dateB.getFullYear() &&

      dateA.getMonth() ===
      dateB.getMonth() &&

      dateA.getDate() ===
      dateB.getDate()
    );

  };


  /*
    -------------------------------------------------------
    SEMANA ATUAL
    -------------------------------------------------------
  */

  const currentWeekStart =
    getStartOfWeek(today);

  const isCurrentWeek =
    isSameDate(
      selectedWeek,
      currentWeekStart
    );


  /*
    -------------------------------------------------------
    STATUS DA AULA
    -------------------------------------------------------
  */

  const isToday =
    isSameDate(
      activityDate,
      today
    );

  const classAlreadyHappened =
    activityDate < today &&
    !isToday;

  const isFutureClass =
    activityDate > today &&
    !isToday;


  /*
    -------------------------------------------------------
    PRÓXIMA AULA
    -------------------------------------------------------
  */

  const getNextActivityDate = () => {

    const currentWeekStart =
      getStartOfWeek(today);

    const currentActivityDate =
      getActivityDate(
        currentWeekStart
      );

    if (
      currentActivityDate >=
      today
    ) {

      return currentActivityDate;

    }

    const nextWeek =
      new Date(
        currentWeekStart
      );

    nextWeek.setDate(
      nextWeek.getDate() +
      7
    );

    return getActivityDate(
      nextWeek
    );

  };


  const nextActivityDate =
    getNextActivityDate();


  /*
    -------------------------------------------------------
    CHAVE DA CHAMADA
    -------------------------------------------------------
  */

  const getAttendanceKey = () => {

    if (!activityData) {
      return null;
    }

    const year =
      activityDate.getFullYear();

    const month =
      String(
        activityDate.getMonth() +
        1
      ).padStart(2, "0");

    const day =
      String(
        activityDate.getDate()
      ).padStart(2, "0");

    return (
      `activityAttendance_` +
      `${activityData.activity_mat}_` +
      `${year}-${month}-${day}`
    );

  };


  /*
    -------------------------------------------------------
    CARREGAR PRESENÇAS
    -------------------------------------------------------

    Somente a presença é carregada do LocalStorage.

    Os alunos continuam vindo do backend.
  */

  useEffect(() => {

    if (!activityData) {
      return;
    }

    const key =
      getAttendanceKey();

    if (!key) {
      return;
    }

    const savedAttendance =
      localStorage.getItem(key);

    if (!savedAttendance) {

      setStudents(
        prev =>
          prev.map(
            student => ({
              ...student,
              status: "undefined",
            })
          )
      );

      return;

    }

    try {

      const parsed =
        JSON.parse(
          savedAttendance
        );

      /*
        Aqui mantemos os dados salvos
        de presença.

        Como a lista de alunos agora vem
        do backend, usamos os alunos atuais
        como base e aplicamos os status
        salvos anteriormente.
      */

      setStudents(
        prev =>
          prev.map(
            student => {

              const savedStudent =
                parsed.find(
                  saved =>
                    saved.id ===
                    student.id
                );

              return {
                ...student,
                status:
                  savedStudent?.status ||
                  "undefined",
              };

            }
          )
      );

    } catch (error) {

      console.error(
        "Erro ao carregar presença:",
        error
      );

      setStudents(
        prev =>
          prev.map(
            student => ({
              ...student,
              status: "undefined",
            })
          )
      );

    }

  }, [
    activityDate.getTime(),
    activityData?.activity_mat,
    userListActivies,
  ]);


  /*
    -------------------------------------------------------
    SALVAR AUTOMATICAMENTE
    -------------------------------------------------------
  */

  const saveAttendance = (
    updatedStudents
  ) => {

    const key =
      getAttendanceKey();

    if (!key) {
      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify(
        updatedStudents
      )
    );

  };


  /*
    -------------------------------------------------------
    STATUS EXIBIDO
    -------------------------------------------------------
  */

  let displayedActivityDate =
    activityDate;

  let displayedStatus =
    "AULA";


  if (isCurrentWeek) {

    if (isToday) {

      displayedStatus =
        "HOJE";

    } else if (isFutureClass) {

      displayedStatus =
        "PRÓXIMA AULA";

    } else if (
      classAlreadyHappened
    ) {

      displayedStatus =
        "REALIZADA";

    }

  }


  /*
    -------------------------------------------------------
    PRESENÇAS
    -------------------------------------------------------
  */

  const presentCount =
    students.filter(
      student =>
        student.status ===
        "present"
    ).length;


  /*
    -------------------------------------------------------
    AUSÊNCIAS
    -------------------------------------------------------
  */

  const absentCount =
    students.filter(
      student =>
        student.status ===
        "absent"
    ).length;


  /*
    -------------------------------------------------------
    A DEFINIR
    -------------------------------------------------------
  */

  const undefinedCount =
    students.filter(
      student =>
        student.status ===
        "undefined"
    ).length;


  /*
    -------------------------------------------------------
    PERCENTUAL
    -------------------------------------------------------
  */

  const attendancePercentage =
    students.length > 0
      ? Math.round(
        (
          presentCount /
          students.length
        ) * 100
      )
      : 0;


  /*
    -------------------------------------------------------
    ALTERAR PRESENÇA
    -------------------------------------------------------
  */

  const toggleAttendance = (
    id
  ) => {

    if (isFutureClass) {
      return;
    }

    if (
      classAlreadyHappened &&
      !canEditPastClass
    ) {
      return;
    }

    const updatedStudents =
      students.map(
        student => {

          if (
            student.id !== id
          ) {
            return student;
          }

          let newStatus;

          if (
            student.status ===
            "undefined"
          ) {

            newStatus =
              "present";

          } else if (
            student.status ===
            "present"
          ) {

            newStatus =
              "absent";

          } else {

            newStatus =
              "undefined";

          }

          return {
            ...student,
            status: newStatus,
          };

        }
      );

    setStudents(
      updatedStudents
    );

    saveAttendance(
      updatedStudents
    );

  };


  /*
    -------------------------------------------------------
    MARCAR TODOS PRESENTES
    -------------------------------------------------------
  */

  const markAllPresent = () => {

    if (isFutureClass) {
      return;
    }

    if (
      classAlreadyHappened &&
      !canEditPastClass
    ) {
      return;
    }

    const updatedStudents =
      students.map(
        student => ({
          ...student,
          status: "present",
        })
      );

    setStudents(
      updatedStudents
    );

    saveAttendance(
      updatedStudents
    );

  };


  /*
    -------------------------------------------------------
    MARCAR TODOS AUSENTES
    -------------------------------------------------------
  */

  const markAllAbsent = () => {

    if (isFutureClass) {
      return;
    }

    if (
      classAlreadyHappened &&
      !canEditPastClass
    ) {
      return;
    }

    const updatedStudents =
      students.map(
        student => ({
          ...student,
          status: "absent",
        })
      );

    setStudents(
      updatedStudents
    );

    saveAttendance(
      updatedStudents
    );

  };


  /*
    -------------------------------------------------------
    NAVEGAÇÃO ENTRE SEMANAS
    -------------------------------------------------------
  */

  const changeWeek = (
    amount
  ) => {

    const newWeek =
      new Date(
        selectedWeek
      );

    newWeek.setDate(
      newWeek.getDate() +
      amount * 7
    );

    setSelectedWeek(
      newWeek
    );

    setCanEditPastClass(
      false
    );

  };


  /*
    -------------------------------------------------------
    SELECIONAR ANO
    -------------------------------------------------------
  */

  const selectYear = (
    year
  ) => {

    const newDate =
      new Date(
        year,
        selectedWeek.getMonth(),
        1
      );

    setSelectedWeek(
      getStartOfWeek(
        newDate
      )
    );

    setCanEditPastClass(
      false
    );

    setYearDialogOpen(
      false
    );

  };


  /*
    -------------------------------------------------------
    SELECIONAR MÊS
    -------------------------------------------------------
  */

  const selectMonth = (
    month
  ) => {

    const newDate =
      new Date(
        selectedWeek.getFullYear(),
        month,
        1
      );

    setSelectedWeek(
      getStartOfWeek(
        newDate
      )
    );

    setCanEditPastClass(
      false
    );

    setMonthDialogOpen(
      false
    );

  };


  /*
    -------------------------------------------------------
    FORMATAR DATA
    -------------------------------------------------------
  */

  const formatDate = (
    date
  ) => {

    return date.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
      }
    );

  };


  /*
    -------------------------------------------------------
    FORMATAR DATA COMPLETA
    -------------------------------------------------------
  */

  const formatFullDate = (
    date
  ) => {

    return date.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  };


  /*
    -------------------------------------------------------
    FORMATAR MÊS
    -------------------------------------------------------
  */

  const formatMonth = (
    date
  ) => {

    return date.toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric",
      }
    );

  };


  /*
    -------------------------------------------------------
    DIAS DA SEMANA
    -------------------------------------------------------
  */

  const weekDays =
    Array.from(
      { length: 7 },
      (_, index) => {

        const date =
          new Date(
            selectedWeek
          );

        date.setDate(
          selectedWeek.getDate() +
          index
        );

        return date;

      }
    );


  /*
    -------------------------------------------------------
    VOLTAR
    -------------------------------------------------------
  */

  const handleBack = () => {

    navigate(-1);

  };


  /*
    -------------------------------------------------------
    CASO NÃO TENHA ATIVIDADE
    -------------------------------------------------------
  */

  if (!activityData) {

    return (

      <VStack
        gap={4}
        align="stretch"
      >

        <HeadingPage
          content="Presenças"
        />

        <Box
          p={6}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          bg="white"
        >

          <Text>
            Nenhuma atividade foi selecionada.
          </Text>

          <Button
            mt={4}
            onClick={handleBack}
          >
            Voltar
          </Button>

        </Box>

      </VStack>

    );

  }


  /*
    -------------------------------------------------------
    ESTILO DA LINHA
    -------------------------------------------------------
  */

  const getStudentRowStyle = (
    status
  ) => {

    if (
      status === "present"
    ) {

      return {
        bg: "green.100",
      };

    }

    if (
      status === "absent"
    ) {

      return {
        bg: "red.100",
      };

    }

    return {
      bg: "gray.100",
    };

  };


  /*
    -------------------------------------------------------
    RENDER
    -------------------------------------------------------
  */

  return (

    <VStack
      gap={4}
      align="stretch"
    >

      {/* ================================================= */}
      {/* CABEÇALHO */}
      {/* ================================================= */}

      <HStack gap={3}>

        <HeadingPage
          content="Presenças"
        />

      </HStack>


      {/* ================================================= */}
      {/* IDENTIFICAÇÃO DA ATIVIDADE */}
      {/* ================================================= */}

      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        bg="white"
      >

        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={4}
        >

          <Box>

            <Heading
              size="md"
              color="brand.primary"
            >

              {activityData.activity_title}

            </Heading>

            <Text
              fontSize="sm"
              color="gray.500"
              mt={1}
            >

              Código:{" "}
              {activityData.activity_mat}

            </Text>

          </Box>


          <HStack
            gap={6}
            fontSize="sm"
            color="gray.600"
          >

            <HStack>

              <FaCalendarAlt />

              <Text>
                {activityWeekDayName}
              </Text>

            </HStack>


            <HStack>

              <FaClock />

              <Text>

                {activityTimeStart}
                {" - "}
                {activityTimeEnd}

              </Text>

            </HStack>

          </HStack>

        </Flex>

      </Box>


      {/* ================================================= */}
      {/* NAVEGAÇÃO DO ANO / MÊS / SEMANA */}
      {/* ================================================= */}

      <Box>

        <Flex
          align="center"
          justify="space-between"
          gap={3}
        >

          <Button
            size="sm"
            variant="surface"
            onClick={() =>
              setYearDialogOpen(true)
            }
          >

            {selectedWeek.getFullYear()}
            {" ▼"}

          </Button>


          <Button
            size="sm"
            variant="surface"
            onClick={() =>
              setMonthDialogOpen(true)
            }
          >

            {formatMonth(
              selectedWeek
            )}

            {" ▼"}

          </Button>


          <HStack
            flex={1}
            justify="center"
            gap={2}
          >

            <Button
              size="sm"
              variant="surface"
              onClick={() =>
                changeWeek(-1)
              }
            >

              <FaChevronLeft />

            </Button>


            <Box
              textAlign="center"
              minW="200px"
            >

              <Text
                fontSize="sm"
                fontWeight="bold"
                color="brand.primary"
              >

                Semana{" "}

                {formatDate(
                  selectedWeek
                )}

                {" — "}

                {formatDate(
                  getEndOfWeek(
                    selectedWeek
                  )
                )}

              </Text>


              <Text
                fontSize="xs"
                color="gray.500"
              >

                {formatMonth(
                  selectedWeek
                )}

              </Text>

            </Box>


            <Button
              size="sm"
              variant="surface"
              onClick={() =>
                changeWeek(1)
              }
            >

              <FaChevronRight />

            </Button>

          </HStack>

        </Flex>

      </Box>


      {/* ================================================= */}
      {/* DIAS DA SEMANA */}
      {/* ================================================= */}

      <Flex
        gap={2}
        overflowX="auto"
      >

        {weekDays.map(
          (date) => {

            const isActivityDay =
              date.getDay() ===
              activityWeekDay;

            const dayIsToday =
              isSameDate(
                date,
                today
              );

            return (

              <Box
                key={
                  date.toISOString()
                }
                flex="1"
                minW="120px"
                border="1px solid"
                borderColor={
                  dayIsToday
                    ? "brand.primary"
                    : isActivityDay
                      ? "brand.secondary"
                      : "gray.200"
                }
                borderRadius="md"
                p={3}
                textAlign="center"
                bg={
                  dayIsToday
                    ? "brand.secondary"
                    : isActivityDay
                      ? "gray.50"
                      : "white"
                }
              >

                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="gray.600"
                >

                  {date
                    .toLocaleDateString(
                      "pt-BR",
                      {
                        weekday: "short",
                      }
                    )
                    .toUpperCase()}

                </Text>


                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  mt={1}
                >

                  {formatDate(
                    date
                  )}

                </Text>


                <Text
                  fontSize="xs"
                  mt={2}
                  fontWeight={
                    dayIsToday ||
                    isActivityDay
                      ? "bold"
                      : "normal"
                  }
                  color={
                    dayIsToday
                      ? "brand.primary"
                      : isActivityDay
                        ? "brand.primary"
                        : "gray.500"
                  }
                >

                  {dayIsToday
                    ? "HOJE"
                    : isActivityDay
                      ? "Aula"
                      : "Sem aula"}

                </Text>

              </Box>

            );

          }
        )}

      </Flex>


      {/* ================================================= */}
      {/* CARD DA AULA */}
      {/* ================================================= */}

      <Box
        border="1px solid"
        borderColor={
          isToday
            ? "brand.primary"
            : "gray.200"
        }
        borderRadius="md"
        overflow="hidden"
        bg="white"
      >

        {/* CABEÇALHO */}

        <Box
          p={4}
          bg={
            isToday
              ? "brand.secondary"
              : "white"
          }
          borderBottom="1px solid"
          borderColor="gray.200"
        >

          <Flex
            justify="space-between"
            align="center"
            gap={4}
          >

            <Box>

              <Heading
                size="sm"
                color="brand.primary"
              >

                {activityWeekDayName}

                {" • "}

                {formatFullDate(
                  displayedActivityDate
                )}

              </Heading>


              <HStack
                mt={2}
                gap={5}
                fontSize="sm"
                color="gray.600"
              >

                <HStack>

                  <FaClock />

                  <Text>

                    {activityTimeStart}
                    {" - "}
                    {activityTimeEnd}

                  </Text>

                </HStack>


                <HStack>

                  <FaUser />

                  <Text>
                    {activityData.activity_title}
                  </Text>

                </HStack>

              </HStack>

            </Box>


            <Box
              px={3}
              py={1}
              borderRadius="md"
              bg={
                isToday
                  ? "brand.primary"
                  : "gray.100"
              }
              color={
                isToday
                  ? "white"
                  : "gray.600"
              }
              fontSize="xs"
              fontWeight="bold"
            >

              {displayedStatus}

            </Box>

          </Flex>

        </Box>


        {/* ================================================= */}
        {/* CONTEÚDO */}
        {/* ================================================= */}

        <Box p={4}>

          {/* AULA DE HOJE */}

          {isToday && (

            <Box
              mb={4}
              p={3}
              borderRadius="md"
              bg="gray.50"
            >

              <Text
                fontSize="sm"
                fontWeight="bold"
                color="brand.primary"
              >

                A aula é hoje.

              </Text>

              <Text
                fontSize="sm"
                color="gray.600"
                mt={1}
              >

                A chamada pode ser realizada agora.

              </Text>

            </Box>

          )}


          {/* PRÓXIMA AULA */}

          {isFutureClass &&
            isCurrentWeek && (

              <Box
                mb={4}
                p={3}
                borderRadius="md"
                bg="gray.50"
              >

                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="brand.primary"
                >

                  Próxima aula

                </Text>

                <Text
                  fontSize="sm"
                  color="gray.600"
                  mt={1}
                >

                  {formatFullDate(
                    activityDate
                  )}

                  {" • "}

                  {activityTimeStart}

                </Text>

              </Box>

            )}


          {/* AULA JÁ REALIZADA */}

          {classAlreadyHappened && (

            <Box
              mb={4}
              p={3}
              borderRadius="md"
              bg="gray.50"
            >

              <Text
                fontSize="sm"
                fontWeight="bold"
                color="gray.700"
              >

                Aula já realizada

              </Text>

              <Text
                fontSize="sm"
                color="gray.600"
                mt={1}
              >

                A próxima aula será em{" "}

                {formatFullDate(
                  nextActivityDate
                )}

                {" • "}

                {activityTimeStart}

              </Text>

            </Box>

          )}


          {/* AVISO PARA AULA PASSADA */}

          {classAlreadyHappened &&
            !canEditPastClass && (

              <Box
                mb={4}
                p={3}
                borderRadius="md"
                border="1px solid"
                borderColor="orange.200"
                bg="orange.50"
              >

                <Flex
                  justify="space-between"
                  align="center"
                  gap={4}
                >

                  <Box>

                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="orange.700"
                    >

                      Lista de presença antiga

                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.600"
                      mt={1}
                    >

                      Esta aula já aconteceu.
                      Para alterar a chamada,
                      confirme a edição.

                    </Text>

                  </Box>


                  <Button
                    size="sm"
                    colorPalette="orange"
                    onClick={() =>
                      setCanEditPastClass(
                        true
                      )
                    }
                  >

                    Editar chamada

                  </Button>

                </Flex>

              </Box>

            )}


          {/* MODO DE EDIÇÃO DE AULA PASSADA */}

          {classAlreadyHappened &&
            canEditPastClass && (

              <Box
                mb={4}
                p={3}
                borderRadius="md"
                bg="blue.50"
                border="1px solid"
                borderColor="blue.200"
              >

                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="blue.700"
                >

                  Editando chamada antiga

                </Text>

                <Text
                  fontSize="sm"
                  color="gray.600"
                  mt={1}
                >

                  As alterações são salvas
                  automaticamente.

                </Text>

              </Box>

            )}


          {/* ================================================= */}
          {/* ÁREA DE PRESENÇAS */}
          {/* ================================================= */}

          <Flex
            justify="space-between"
            align="center"
            mb={4}
            wrap="wrap"
            gap={4}
          >

            <Flex
              gap={2}
              wrap="wrap"
            >

              <Button
                size="sm"
                variant="surface"
                disabled={
                  isFutureClass ||
                  (
                    classAlreadyHappened &&
                    !canEditPastClass
                  )
                }
                onClick={
                  markAllPresent
                }
              >

                <FaCheck />

                Marcar todos presentes

              </Button>


              <Button
                size="sm"
                variant="surface"
                disabled={
                  isFutureClass ||
                  (
                    classAlreadyHappened &&
                    !canEditPastClass
                  )
                }
                onClick={
                  markAllAbsent
                }
              >

                <FaCheck />

                Marcar todos ausentes

              </Button>

            </Flex>


            {/* RESUMO */}

            <HStack
              gap={5}
              textAlign="right"
            >

              <Box>

                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  Presentes
                </Text>

                <Text
                  fontSize="lg"
                  fontWeight="bold"
                  color="green.600"
                >

                  {presentCount}

                </Text>

              </Box>


              <Box>

                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  Ausentes
                </Text>

                <Text
                  fontSize="lg"
                  fontWeight="bold"
                  color="red.500"
                >

                  {absentCount}

                </Text>

              </Box>


              <Box>

                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  A definir
                </Text>

                <Text
                  fontSize="lg"
                  fontWeight="bold"
                  color="gray.500"
                >

                  {undefinedCount}

                </Text>

              </Box>


              <Box>

                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  Frequência
                </Text>

                <Text
                  fontSize="lg"
                  fontWeight="bold"
                  color="brand.primary"
                >

                  {attendancePercentage}%

                </Text>

              </Box>

            </HStack>

          </Flex>


          {/* ================================================= */}
          {/* TABELA DE ALUNOS */}
          {/* ================================================= */}

          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            overflow="hidden"
          >

            <Table.Root
              variant="line"
              size="sm"
            >

              <Table.Header>

                <Table.Row>

                  <Table.ColumnHeader>
                    Aluno
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Presença
                  </Table.ColumnHeader>

                </Table.Row>

              </Table.Header>


              <Table.Body>

                {students.map(
                  (student) => {

                    const isDisabled =
                      isFutureClass ||
                      (
                        classAlreadyHappened &&
                        !canEditPastClass
                      );


                    return (

                      <Table.Row
                        key={
                          student.id
                        }
                        cursor={
                          isDisabled
                            ? "default"
                            : "pointer"
                        }
                        onClick={() =>
                          toggleAttendance(
                            student.id
                          )
                        }
                        _hover={
                          isDisabled
                            ? undefined
                            : {
                              bg:
                                student.status ===
                                "present"
                                  ? "green.200"
                                  : student.status ===
                                    "absent"
                                    ? "red.200"
                                    : "gray.200",
                            }
                        }
                        {...getStudentRowStyle(
                          student.status
                        )}
                      >

                        <Table.Cell>

                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                          >

                            {student.name}

                          </Text>

                        </Table.Cell>


                        <Table.Cell>

                          <HStack gap={2}>

                            <Box
                              w="9px"
                              h="9px"
                              borderRadius="full"
                              bg={
                                student.status ===
                                "present"
                                  ? "green.500"
                                  : student.status ===
                                    "absent"
                                    ? "red.500"
                                    : "gray.400"
                              }
                            />


                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color={
                                student.status ===
                                "present"
                                  ? "green.700"
                                  : student.status ===
                                    "absent"
                                    ? "red.700"
                                    : "gray.600"
                              }
                            >

                              {
                                student.status ===
                                "present"
                                  ? "Presente"
                                  : student.status ===
                                    "absent"
                                    ? "Ausente"
                                    : "A definir"
                              }

                            </Text>

                          </HStack>

                        </Table.Cell>

                      </Table.Row>

                    );

                  }
                )}

              </Table.Body>

            </Table.Root>

          </Box>


          {/* ================================================= */}
          {/* INFORMAÇÃO DE SALVAMENTO */}
          {/* ================================================= */}

          <Text
            fontSize="xs"
            color="gray.400"
            textAlign="right"
            mt={3}
          >

            As alterações são salvas automaticamente.

          </Text>

        </Box>

      </Box>


      {/* ================================================= */}
      {/* DIALOG — SELECIONAR ANO */}
      {/* ================================================= */}

      <Dialog.Root
        open={yearDialogOpen}
        onOpenChange={(e) =>
          setYearDialogOpen(
            e.open
          )
        }
      >

        <Portal>

          <Dialog.Backdrop />

          <Dialog.Positioner>

            <Dialog.Content>

              <Dialog.Header>

                <Dialog.Title>
                  Selecionar ano
                </Dialog.Title>

              </Dialog.Header>


              <Dialog.Body>

                <Grid
                  templateColumns="repeat(3, 1fr)"
                  gap={2}
                >

                  {Array.from(
                    { length: 9 },
                    (_, index) => {

                      const year =
                        today.getFullYear() -
                        4 +
                        index;

                      const isSelected =
                        selectedWeek.getFullYear() ===
                        year;

                      return (

                        <Button
                          key={year}
                          variant={
                            isSelected
                              ? "solid"
                              : "surface"
                          }
                          bg={
                            isSelected
                              ? "brand.primary"
                              : undefined
                          }
                          color={
                            isSelected
                              ? "white"
                              : undefined
                          }
                          onClick={() =>
                            selectYear(
                              year
                            )
                          }
                        >

                          {year}

                        </Button>

                      );

                    }
                  )}

                </Grid>

              </Dialog.Body>


              <Dialog.Footer>

                <Dialog.ActionTrigger
                  asChild
                >

                  <Button
                    variant="outline"
                  >
                    Cancelar
                  </Button>

                </Dialog.ActionTrigger>

              </Dialog.Footer>

            </Dialog.Content>

          </Dialog.Positioner>

        </Portal>

      </Dialog.Root>


      {/* ================================================= */}
      {/* DIALOG — SELECIONAR MÊS */}
      {/* ================================================= */}

      <Dialog.Root
        open={monthDialogOpen}
        onOpenChange={(e) =>
          setMonthDialogOpen(
            e.open
          )
        }
      >

        <Portal>

          <Dialog.Backdrop />

          <Dialog.Positioner>

            <Dialog.Content>

              <Dialog.Header>

                <Dialog.Title>
                  Selecionar mês
                </Dialog.Title>

              </Dialog.Header>


              <Dialog.Body>

                <Grid
                  templateColumns="repeat(3, 1fr)"
                  gap={2}
                >

                  {monthNames.map(
                    (
                      month,
                      index
                    ) => {

                      const isSelected =
                        selectedWeek.getMonth() ===
                        index;

                      return (

                        <Button
                          key={month}
                          variant={
                            isSelected
                              ? "solid"
                              : "surface"
                          }
                          bg={
                            isSelected
                              ? "brand.primary"
                              : undefined
                          }
                          color={
                            isSelected
                              ? "white"
                              : undefined
                          }
                          onClick={() =>
                            selectMonth(
                              index
                            )
                          }
                        >

                          {month}

                        </Button>

                      );

                    }
                  )}

                </Grid>

              </Dialog.Body>


              <Dialog.Footer>

                <Dialog.ActionTrigger
                  asChild
                >

                  <Button
                    variant="outline"
                  >
                    Cancelar
                  </Button>

                </Dialog.ActionTrigger>

              </Dialog.Footer>

            </Dialog.Content>

          </Dialog.Positioner>

        </Portal>

      </Dialog.Root>

    </VStack>

  );

}