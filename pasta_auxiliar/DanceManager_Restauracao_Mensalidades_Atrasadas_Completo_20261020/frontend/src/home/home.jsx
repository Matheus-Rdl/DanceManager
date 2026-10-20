/* Página inicial: resumo operacional e financeiro do Dance Manager. */
import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Heading, SimpleGrid, Skeleton, Text, VStack } from "@chakra-ui/react";
import { FiAlertCircle, FiCalendar, FiCreditCard, FiRefreshCw, FiUsers } from "react-icons/fi";
import dashboardServices from "../services/dashboardServices";
import DashboardStatCard from "./components/DashboardStatCard";
import DashboardQuickActions from "./components/DashboardQuickActions";
import DashboardFinancialSummary from "./components/DashboardFinancialSummary";
import DashboardTodayClasses from "./components/DashboardTodayClasses";
import DashboardAlerts from "./components/DashboardAlerts";

const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const displayMonth = value => {
  if (!value) return "Mês atual";
  const [year, month] = value.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("pt-BR", {month:"long",year:"numeric"}).format(new Date(year,month-1,1));
  return formatted.charAt(0).toUpperCase()+formatted.slice(1);
};

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const refresh = useCallback(() => setRetry(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    dashboardServices.getSummary({ signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setSummary(data); })
      .catch(err => { if (!controller.signal.aborted) { setSummary(null); setError(err.message || "Não foi possível carregar o painel."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const cards = [
    { title: "Alunos ativos", value: summary?.metrics?.activeStudents ?? 0, detail: "Alunos e bolsistas com cadastro ativo", icon: FiUsers, tone: "#0b6b5b", to: "/PeopleManagement" },
    { title: "Turmas ativas", value: summary?.metrics?.activeClasses ?? 0, detail: "Atividades em andamento", icon: FiCalendar, tone: "#2865a2", to: "/ActivityManagement" },
    { title: "Recebido no mês", value: money(summary?.metrics?.received), detail: "Pagamentos efetivos", icon: FiCreditCard, tone: "#148443", to: "/financeiro" },
    { title: "Mensalidades atrasadas", value: summary?.metrics?.overdueFeesCount ?? 0, detail: `${money(summary?.metrics?.overdueFeesValue)} ainda em aberto`, icon: FiAlertCircle, tone: "#c13b3e", to: "/MonthlyFeesOverdue" }
  ];

  return <VStack align="stretch" gap={4} width="100%" minW={0} bg="#f8faf9" pb={6}>
    <Flex justify="space-between" align={{base:"flex-start",md:"center"}} gap={3} wrap="wrap">
      <Box><Heading fontSize={{base:"22px",md:"26px"}} fontWeight="800" color="#062f2b">Painel Principal</Heading><Text mt={1} fontSize="12px" color="#607873">Visão rápida da escola · {displayMonth(summary?.month)}</Text></Box>
      <Button variant="outline" size="sm" borderColor="#d6e3df" color="#0b6b5b" onClick={refresh} disabled={loading}><FiRefreshCw/> Atualizar</Button>
    </Flex>
    {error && <Flex p={4} border="1px solid #efc6c6" bg="#fff3f3" borderRadius="9px" justify="space-between" align="center" gap={2} wrap="wrap"><Text fontSize="12px" color="#a32f31">{error}</Text><Button size="xs" onClick={refresh}>Tentar novamente</Button></Flex>}
    <Box>
      <Heading fontSize="15px" color="#062f2b" mb={3}>Visão Geral</Heading>
      {loading ? <SimpleGrid columns={{base:2,lg:4}} gap={3}>{[0,1,2,3].map(index=><Skeleton key={index} height="106px" borderRadius="10px"/>)}</SimpleGrid> : !error && summary ?
        <SimpleGrid columns={{base:2,lg:4}} gap={3}>{cards.map(card=><DashboardStatCard key={card.title} {...card}/>)}</SimpleGrid> : !error && <Text fontSize="12px" color="#738883">Nenhum dado disponível.</Text>}
    </Box>
    {/* 2. Acessos rápidos continuam funcionando se o resumo falhar. */}
    <DashboardQuickActions/>
    {!loading && !error && summary && <>
      {/* 3. Resumo financeiro compacto */}
      <DashboardFinancialSummary data={summary.finance}/>
      {/* 4. Aulas e 5. alertas */}
      <SimpleGrid columns={{base:1,lg:2}} gap={3} alignItems="stretch">
        <DashboardTodayClasses classes={summary.todayClasses}/>
        <DashboardAlerts alerts={summary.alerts}/>
      </SimpleGrid>
    </>}
  </VStack>;
}
