import { useState } from "react";
import { Box, Field, HStack, Portal, Text, Tooltip } from "@chakra-ui/react";
import { FaExclamationCircle } from "react-icons/fa";

/* O texto explicativo vem exclusivamente do helpText do documento em fields. */
export default function FormFieldLabel({ field }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpText = typeof field?.helpText === "string" ? field.helpText.trim() : "";
  const title = field?.title || field?.field || "Campo";

  return (
    <HStack gap="5px" mb="6px" alignItems="center" minH="18px" width="fit-content">
      <Field.Label htmlFor={field?.field} m={0} fontSize="13px" fontWeight="bold" color="#163b37" lineHeight="1.25">
        {title}
        {field?.required && <Text as="span" color="#d14343" ml="3px">*</Text>}
      </Field.Label>
      {helpText && (
        <Tooltip.Root
          open={helpOpen}
          onOpenChange={event => setHelpOpen(event.open)}
          openDelay={150}
          closeDelay={150}
          positioning={{ placement: "top" }}
        >
          <Tooltip.Trigger asChild>
            <Box
              as="button"
              type="button"
              aria-label={`Informações sobre ${title}`}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              color="#71858a"
              cursor="help"
              p={0}
              minW="16px"
              minH="20px"
              bg="transparent"
              _hover={{ color: "#14833b" }}
              _focusVisible={{ outline: "2px solid #0b6b5b", outlineOffset: "2px" }}
              onClick={event => { event.preventDefault(); event.stopPropagation(); setHelpOpen(true); }}
            >
              <FaExclamationCircle size={13} />
            </Box>
          </Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner>
              <Tooltip.Content bg="#163b37" color="white" fontSize="12px" maxW="300px" px={3} py={2} borderRadius="6px" boxShadow="md">
                {helpText}
                <Tooltip.Arrow><Tooltip.ArrowTip /></Tooltip.Arrow>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      )}
    </HStack>
  );
}
