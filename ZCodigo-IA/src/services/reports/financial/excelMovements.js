import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getFinancialMovementExportRows } from "./financialMovementRows";

/* EN: Export only the currently filtered, realized cash transactions to a single XLSX tab.
   PT: Exporta somente os pagamentos realizados e filtrados, em uma única aba XLSX. */
export async function generateExcelMovements({ movements = [], accounts = [], from, to }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DanceManager";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Movimentações", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Data", key: "date", width: 16 },
    { header: "Iniciador", key: "initiator", width: 20 },
    { header: "Método", key: "method", width: 20 },
    { header: "Origem", key: "origin", width: 19 },
    { header: "Categoria", key: "category", width: 22 },
    { header: "Descrição", key: "description", width: 48 },
    { header: "Valor", key: "amount", width: 20 },
    { header: "Tipo", key: "type", width: 14 },
    { header: "Conta financeira", key: "accountName", width: 24 },
    { header: "ID da conta", key: "accountId", width: 39 }
  ];
  const header = sheet.getRow(1);
  header.height = 27;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E43" } };
  header.alignment = { vertical: "middle", horizontal: "left" };

  /* EN: Use genuine Excel dates and signed numeric BRL values for reliable validation and sums.
     PT: Usa datas reais do Excel e valores numéricos com sinal para permitir conferência e soma. */
  /* EN: Keep account labels and IDs tied to each settlement, even for mixed-account fees.
     PT: Preserva nome e ID da conta de cada parcela, inclusive nas mensalidades mistas. */
  const rows = getFinancialMovementExportRows(movements, { accounts });
  for (const item of rows) {
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(item.date);
    const row = sheet.addRow({
      ...item,
      date: validDate ? new Date(`${item.date}T00:00:00.000Z`) : item.date
    });
    row.height = 21;
    row.alignment = { vertical: "middle" };
    if (row.number % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F8F7" } };
    }
  }
  sheet.getColumn("date").numFmt = "dd/mm/yyyy";
  sheet.getColumn("amount").numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
  sheet.getColumn("amount").alignment = { horizontal: "right", vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: `J${Math.max(2, rows.length + 1)}` };

  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = `${from || "inicio"}_a_${to || "fim"}`.replace(/[^\dA-Za-z_\-]/g, "");
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Movimentacoes_${suffix}.xlsx`);
}
