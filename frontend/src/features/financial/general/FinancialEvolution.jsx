import FinancialTimelineChart from "./FinancialTimelineChart";
export default function FinancialEvolution({ period, refreshKey=0 }) {
  return <FinancialTimelineChart period={period} refreshKey={refreshKey}/>;
}
