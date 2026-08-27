import { useState } from "react";
import { Dialog, NativeSelect, RadioGroup, Button, VStack, HStack, Box, Portal } from "@chakra-ui/react";
import { generatePresenceReport } from "../../../../services/reports/presences/generatePresenceReport";
  
export default function DailogPresence({ open, onClose, activityData, usersList }) {

  /*
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [format, setFormat] = useState("pdf");

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const anos = [2024, 2025, 2026];

  function handleSubmit(event) {
    event.preventDefault();
    generatePresenceReport({
      formato: format,
      turma: activityData,
      mes: month,
      ano: year,
      alunos: usersList,
    });
  }

  */

  return (

    {/*

    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
      size="lg"
    >
      <Portal>

        <Dialog.Backdrop />

        <Dialog.Positioner>

          <Dialog.Content
            w="80vw"
            maxW="700px"
            maxH="80vh"
          >
            <Dialog.Header>Presença da Atividade</Dialog.Header>
            <Dialog.Body>
              <form id="presence-form" onSubmit={handleSubmit}>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Box as="label" mb={1} display="block">Mês:</Box>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        required
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                      >
                        <option value="">Selecione o mês</option>
                        {months.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Box>

                  <Box>
                    <Box as="label" mb={1} display="block">Ano:</Box>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        required
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                      >
                        <option value="">Selecione o ano</option>
                        {anos.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Box>

                  <Box>
                    <Box as="label" mb={1} display="block">Formato:</Box>
                    <RadioGroup.Root value={format} onValueChange={(e) => setFormat(e.value)}>
                      <HStack spacing={4} display={"flex"} align={"flex-start"} flexDirection={"column"}>
                        <RadioGroup.Item value="pdf">
                          PDF
                        </RadioGroup.Item>
                        <RadioGroup.Item value="excel">
                          Excel
                        </RadioGroup.Item>
                      </HStack>
                    </RadioGroup.Root>
                  </Box>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Button colorScheme="blue" type="submit" form="presence-form">
                Gerar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
    */}
  );
}
