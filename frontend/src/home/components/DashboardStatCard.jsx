import { Box, Flex, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";

export default function DashboardStatCard({ title, value, detail, icon: Icon, tone = "#064e43", to }) {
  return <Box as={Link} to={to} display="block" minW={0} bg="white" border="1px solid #dae6e2" borderRadius="10px" p={{ base: 3, md: 4 }}
    cursor="pointer" transition="border-color .15s, transform .15s" _hover={{ borderColor: "#8bb9ad", transform: "translateY(-1px)" }}>
    <Flex justify="space-between" align="center" gap={2}>
      <Flex align="center" gap={2} minW={0}><Icon size={17} color={tone}/><Text color="#617974" fontWeight="600" fontSize="11px">{title}</Text></Flex>
      <FiArrowUpRight size={13} color="#8ba59f"/>
    </Flex>
    <Text mt={2} fontSize={{ base: "19px", md: "24px" }} lineHeight="1.2" fontWeight="800" color={tone} overflowWrap="anywhere">{value}</Text>
    <Text mt={2} fontSize="10px" color="#738883">{detail}</Text>
  </Box>;
}
