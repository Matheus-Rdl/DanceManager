import { Badge, Box, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { FiCreditCard, FiDollarSign, FiHome } from "react-icons/fi";
import { COLORS } from "./financialPeriod";
import { financialAccountMoney, financialAccountTypeLabel } from "./financialAccountsView";

const accountIcons = { bank: FiHome, payment: FiCreditCard, cash: FiDollarSign };

/* EN: Reusable card for any registered account; no Noh/InfinitePay names are hardcoded.
       Its amount is the calculated API balance, never a locally stored current balance.
   PT: Card reutilizável para qualquer conta cadastrada, sem fixar nomes de instituições.
       O valor vem do saldo calculado pela API, nunca de um saldo atual salvo no frontend. */
export default function FinancialAccountCard({ account }) {
  const Icon = accountIcons[account.type] || FiCreditCard;
  const amountColor = account.balance < 0 ? "#c4363c" : "#075749";
  return <Box bg="white" border="1px solid #dfe8e4" borderRadius="13px"
    p={{ base: 3, md: 4 }} minW={0} boxShadow="0 3px 12px rgba(7,63,51,0.055)">
    <VStack align="stretch" gap={3}>
      <Flex justify="space-between" align="start" gap={2} wrap="wrap">
        <Flex align="center" gap={2} minW={0}>
          <Flex w="35px" h="35px" bg="#e9f6f1" borderRadius="10px" align="center"
            justify="center" color={COLORS.green} flexShrink={0}><Icon size={18}/></Flex>
          <Box minW={0}>
            <Text fontWeight="700" fontSize="13px" color="#203b32" overflowWrap="anywhere">{account.name}</Text>
            <Text fontSize="10px" color={COLORS.gray}>{financialAccountTypeLabel(account.type)}</Text>
          </Box>
        </Flex>
        <Badge bg={account.active ? "#e9f6f1" : "#f1f3f3"}
          color={account.active ? "#168559" : COLORS.gray} fontSize="10px">
          {account.active ? "Ativa" : "Inativa"}
        </Badge>
      </Flex>
      <Box minW={0}>
        <Text fontSize="11px" color={COLORS.gray}>Saldo calculado</Text>
        <Heading mt={1} fontSize={{ base: "20px", md: "25px" }} fontWeight="800"
          lineHeight="1.2" color={account.available ? amountColor : COLORS.gray}
          overflowWrap="anywhere" fontVariantNumeric="tabular-nums">
          {financialAccountMoney(account.balance)}
        </Heading>
        {!account.available && <Text mt={2} color="#a86c00" fontSize="10px">
          Saldo indisponível para a data consultada.
        </Text>}
      </Box>
      {account.isDefault && <Text fontSize="10px" color={COLORS.gray}>Conta padrão</Text>}
    </VStack>
  </Box>;
}
