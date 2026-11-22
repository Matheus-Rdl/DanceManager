import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { IoWalletOutline } from "react-icons/io5";
import { COLORS, formatDate } from "./financialPeriod";
import { financialAccountMoney } from "./financialAccountsView";

/* EN: Always display the server's consolidated balance, not the selected account or period result.
       Incomplete balances remain explicitly unavailable instead of silently becoming zero.
   PT: Sempre exibe o saldo consolidado calculado no backend, não o resultado do período.
       Saldos incompletos aparecem como indisponíveis, nunca como zero fictício. */
export default function FinancialAccountsSummary({ totalBalance, complete, asOf }) {
  return <Box bg="linear-gradient(130deg, #ffffff 30%, #eaf7ef 145%)"
    border="1px solid #badccf" borderRadius="13px" p={{ base: 3, md: 4 }}
    boxShadow="0 3px 12px rgba(7,63,51,0.04)">
    <Flex justify="space-between" align={{ base: "start", md: "center" }}
      gap={3} wrap="wrap">
      <Flex gap={3} align="center" minW={0}>
        <Flex w="39px" h="39px" bg="#e9f6f1" color="#075749"
          borderRadius="10px" align="center" justify="center" flexShrink={0}><IoWalletOutline size={20}/></Flex>
        <Box>
          <Text fontSize={{ base: "12px", md: "14px" }} color="#075749" fontWeight="700">
            Saldo total das contas
          </Text>
          <Text fontSize="11px" color={COLORS.gray}>Todas as contas, inclusive inativas</Text>
        </Box>
      </Flex>
      <Heading fontSize={{ base: "23px", md: "29px" }} fontWeight="800"
        color={complete ? totalBalance < 0 ? "#c4363c" : "#168559" : COLORS.gray}
        fontVariantNumeric="tabular-nums" overflowWrap="anywhere">
        {financialAccountMoney(complete ? totalBalance : null)}
      </Heading>
    </Flex>
    <Text mt={3} fontSize="11px" color={COLORS.gray}>
      {complete ? `Saldo calculado até ${formatDate(asOf)}.` :
        "Total indisponível: uma ou mais contas ainda não têm saldo para esta data."}
    </Text>
  </Box>;
}
