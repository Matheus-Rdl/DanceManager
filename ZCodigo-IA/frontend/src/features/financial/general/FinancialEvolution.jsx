import FinancialTimelineChart from "./FinancialTimelineChart";
export default function FinancialEvolution({ period, refreshKey=0, accountId="" }) {
  return <FinancialTimelineChart period={period} refreshKey={refreshKey} accountId={accountId}/>;
}
