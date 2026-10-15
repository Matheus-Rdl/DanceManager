import { useState } from "react";
import { Box, Button, Flex, NativeSelect, Popover, Portal, Text } from "@chakra-ui/react";
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiRotateCcw } from "react-icons/fi";
import { COLORS, MONTHS, PERIOD_MODES, formatMonth, nowReference, periodRange, shiftMonth } from "./financialPeriod";

/* O período pertence à aba atual. Este componente altera apenas a seleção recebida por props. */
export default function FinancialPeriodSelector({ period, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(period.reference.slice(5));
  const [draftYear, setDraftYear] = useState(period.year);
  const isYear = period.mode === "year";
  const isMonth = period.mode === "month";
  const [year, month] = period.reference.split("-");
  const currentReference = nowReference();
  const currentYear = currentReference.slice(0, 4);
  const periodLabel = isYear ? `${period.year}` : formatMonth(period.reference);
  const periodHint = isYear ? "Ano selecionado" : isMonth ? "Competência selecionada" : `Mês final dos últimos ${period.mode} meses`;
  /* Informação visível em todas as abas, sempre baseada no filtro realmente aplicado. */
  const { from, to } = periodRange(period);
  const periodDescription = isYear
    ? `Visão anual de ${period.year}`
    : isMonth
      ? `Visão mensal de ${formatMonth(period.reference)}`
      : `Últimos ${period.mode} meses até ${formatMonth(period.reference)}`;
  const periodDetails = isYear
    ? `Janeiro a dezembro de ${period.year}`
    : isMonth
      ? "Competência selecionada"
      : `${formatMonth(from)} a ${formatMonth(to)}`;
  const years = Array.from(new Set([
    Number(year), Number(period.year), Number(draftYear),
    ...Array.from({ length: 21 }, (_, i) => Number(currentYear) + 5 - i)
  ])).sort((a, b) => b - a);

  const changeMode = mode => {
    setOpen(false);
    onChange({ ...period, mode });
  };

  const navigate = delta => {
    if (isYear) {
      const nextYear = String(Number(period.year) + delta);
      onChange({ ...period, year: nextYear, reference: `${nextYear}-${month}` });
      return;
    }
    const reference = shiftMonth(period.reference, delta);
    onChange({ ...period, reference, year: reference.slice(0, 4) });
  };

  const handlePopoverChange = details => {
    if (details.open) {
      setDraftMonth(month);
      setDraftYear(isYear ? String(period.year) : year);
    }
    setOpen(details.open);
  };

  const applySelection = () => {
    const nextYear = String(draftYear);
    const nextMonth = isYear ? month : draftMonth;
    onChange({ ...period, year: nextYear, reference: `${nextYear}-${nextMonth}` });
    setOpen(false);
  };

  const goToCurrent = () => {
    onChange({ ...period, reference: currentReference, year: currentYear });
    setOpen(false);
  };

  return <Box minW={0}>
    {/* Os quatro modos permanecem visíveis e independentes em cada aba. */}
    <Flex bg="white" border="1px solid #d7e2df" borderRadius="9px" p="5px" gap="4px" mb={2} minW={0}>
      {PERIOD_MODES.map(item => <Button key={item.id} flex="1" minW={0} h="34px" px={{ base: 1, md: 4 }}
        fontSize={{ base: "10px", sm: "11px", md: "12px" }} fontWeight="600" borderRadius="6px"
        bg={period.mode === item.id ? COLORS.green : "transparent"}
        color={period.mode === item.id ? "white" : COLORS.green}
        _hover={{ bg: period.mode === item.id ? COLORS.green : "#edf5f2" }}
        onClick={() => changeMode(item.id)}>{item.label}</Button>)}
    </Flex>

    {/* Mesmo padrão da tela de Mensalidades: setas nas pontas, competência central. */}
    <Flex bg="white" border="1px solid #d7e2df" borderRadius="9px" px={{ base: 2, md: 3 }} py="8px"
      minW={0} gap={2} align="center" justify="space-between">
      <Button variant="ghost" h="36px" minW={{ base: "38px", md: "130px" }} px={{ base: 2, md: 3 }}
        color="#174f4a" borderRadius="8px" _hover={{ bg: "#f2f7f6" }}
        aria-label={isYear ? "Ano anterior" : "Mês anterior"} onClick={() => navigate(-1)}>
        <FiChevronLeft size={18}/><Text display={{ base: "none", md: "block" }} fontSize="12px">{isYear ? "Ano anterior" : "Mês anterior"}</Text>
      </Button>

      <Popover.Root open={open} onOpenChange={handlePopoverChange} positioning={{ placement: "bottom", gutter: 6 }}>
        <Popover.Trigger asChild>
          <Button variant="ghost" h="auto" minH="42px" minW={0} maxW="100%" flex="1" px={{ base: 1, md: 3 }}
            py="2px" borderRadius="8px" _hover={{ bg: "#f2f7f6" }}
            aria-label={`Alterar período: ${periodLabel}`}>
            <Flex align="center" justify="center" minW={0} gap={{ base: 1, sm: 2 }}>
              <Box color={COLORS.green} flexShrink={0}><FiCalendar size={14}/></Box>
              <Box minW={0} textAlign="center">
                <Text color="#063f39" fontSize={{ base: "12px", md: "13px" }} fontWeight="700" lineHeight="1.25"
                  whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">{periodLabel}</Text>
                <Text color="#71858a" fontSize="10px" lineHeight="1.3" display={{ base: "none", sm: "block" }}>{periodHint}</Text>
              </Box>
              <Box color="#71858a" flexShrink={0}><FiChevronDown size={13}/></Box>
            </Flex>
          </Button>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content width={{ base: "min(320px, calc(100vw - 24px))", md: "310px" }}
              bg="white" border="1px solid #d7e2df" borderRadius="10px" boxShadow="lg" p={3}>
              <Popover.Body p={0}>
                <Text mb={3} color="#063f39" fontSize="13px" fontWeight="700">
                  {isYear ? "Escolher ano" : isMonth ? "Escolher mês e ano" : "Escolher o fim do período"}
                </Text>
                <Flex gap={2}>
                  {!isYear && <Box flex="1" minW={0}>
                    <Text mb="4px" fontSize="11px" color={COLORS.gray}>Mês</Text>
                    <NativeSelect.Root size="sm" width="100%">
                      <NativeSelect.Field aria-label="Escolher mês" value={draftMonth} onChange={e => setDraftMonth(e.target.value)}>
                        {MONTHS.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator/>
                    </NativeSelect.Root>
                  </Box>}
                  <Box flex={isYear ? "1" : "0 0 105px"} minW={0}>
                    <Text mb="4px" fontSize="11px" color={COLORS.gray}>Ano</Text>
                    <NativeSelect.Root size="sm" width="100%">
                      <NativeSelect.Field aria-label="Escolher ano" value={draftYear} onChange={e => setDraftYear(e.target.value)}>
                        {years.map(value => <option key={value} value={String(value)}>{value}</option>)}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator/>
                    </NativeSelect.Root>
                  </Box>
                </Flex>
                <Flex mt={4} gap={2} justify="space-between" align="center">
                  <Button size="sm" variant="ghost" color={COLORS.green} onClick={goToCurrent}>
                    <FiRotateCcw/> {isYear ? "Ano atual" : "Mês atual"}
                  </Button>
                  <Button size="sm" bg={COLORS.green} color="white" _hover={{ bg: "#08715c" }} onClick={applySelection}>Aplicar</Button>
                </Flex>
              </Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>

      <Button variant="ghost" h="36px" minW={{ base: "38px", md: "130px" }} px={{ base: 2, md: 3 }}
        color="#174f4a" borderRadius="8px" _hover={{ bg: "#f2f7f6" }}
        aria-label={isYear ? "Próximo ano" : "Próximo mês"} onClick={() => navigate(1)}>
        <Text display={{ base: "none", md: "block" }} fontSize="12px">{isYear ? "Próximo ano" : "Próximo mês"}</Text><FiChevronRight size={18}/>
      </Button>
    </Flex>

    {/* Período efetivo aplicado às consultas desta aba (inclusive ao alternar de aba). */}
    <Flex mt={2} bg="#edf6f3" border="1px solid #d8e9e3" borderRadius="8px"
      px={{ base: 3, md: 4 }} py="9px" gap={2} align={{ base: "flex-start", sm: "center" }}
      justify="space-between" wrap="wrap" role="status" aria-live="polite">
      <Flex align="center" gap={2} minW={0}>
        <Box color={COLORS.green} flexShrink={0}><FiCalendar size={14}/></Box>
        <Text fontSize={{ base: "11px", md: "12px" }} fontWeight="600" color="#174f4a">
          <Text as="span" color="#607873" fontWeight="500">Exibindo: </Text>{periodDescription}
        </Text>
      </Flex>
      <Text fontSize="10px" color="#607873" pl={{ base: "22px", sm: 0 }}>
        {periodDetails}
      </Text>
    </Flex>
  </Box>;
}
