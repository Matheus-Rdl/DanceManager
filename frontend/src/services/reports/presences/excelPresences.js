/*
|--------------------------------------------------------------------------
| Imports
|--------------------------------------------------------------------------
|
| ExcelJS:
| Library responsible for creating and editing Excel files (.xlsx)
|
| file-saver:
| Responsible for downloading the generated file in the browser
|
| selectOptions:
| Object containing the application's select options
| Used here to convert activity_days number into readable text
|
*/

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { selectOptions } from "../../../utils/userSelectOptions";

/*
|--------------------------------------------------------------------------
| Function: generateExcelPresences
|--------------------------------------------------------------------------
|
| Responsible for generating the attendance list Excel file.
|
| Author: Matheus Rodrigues
| Last Edit: 13/05/2026
|
| Params:
| turma  -> Activity/class information
| alunos -> Students list
| mes    -> Selected month
| ano    -> Selected year
|
*/

export async function generateExcelPresences({
  turma,
  alunos,
  mes,
  ano
}) {

  /*
  |--------------------------------------------------------------------------
  | Convert activity day number to readable text
  |--------------------------------------------------------------------------
  |
  | Example:
  | 7 -> "SÁBADO"
  |
  */
  const activityDayText =
    selectOptions.activity_days[turma.activity_days]?.split(" - ")[1];

  /*
  |--------------------------------------------------------------------------
  | Create workbook and worksheet
  |--------------------------------------------------------------------------
  |
  | Workbook -> Excel file
  | Worksheet -> Excel page/tab
  |
  */
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Presença");

  /*
  |--------------------------------------------------------------------------
  | Calculate days of selected month
  |--------------------------------------------------------------------------
  */
  const diasDoMes = new Date(ano, mes, 0).getDate();

  /*
  |--------------------------------------------------------------------------
  | Array that stores valid attendance days
  |--------------------------------------------------------------------------
  |
  | Example:
  | Saturdays of the month:
  | [03, 10, 17, 24]
  |
  */
  const dias = [];

  /*
  |--------------------------------------------------------------------------
  | Month names used in headers
  |--------------------------------------------------------------------------
  */
  const monthNames = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];

  /*
  |--------------------------------------------------------------------------
  | Generate only activity days
  |--------------------------------------------------------------------------
  |
  | Example:
  | If activity day is Saturday,
  | only Saturdays will be added
  |
  */
  for (let dia = 1; dia <= diasDoMes; dia++) {
    const data = new Date(ano, mes - 1, dia);

    /*
    |--------------------------------------------------------------------------
    | Compare JS day with activity day
    |--------------------------------------------------------------------------
    |
    | JS:
    | 0 -> Sunday
    | 6 -> Saturday
    |
    */
    if (data.getDay() === Number(turma.activity_days) - 1) {
      dias.push(dia);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Total table columns
  |--------------------------------------------------------------------------
  |
  | +2 because:
  | Matrícula
  | Aluno
  |
  */
  const totalColumns = dias.length + 2;

  /*
  |--------------------------------------------------------------------------
  | Merge first row cells
  |--------------------------------------------------------------------------
  |
  | Creates large title area
  |
  */
  sheet.mergeCells(1, 1, 1, totalColumns);
  const titleCell = sheet.getCell("A1");

  /*
  |--------------------------------------------------------------------------
  | Main title content
  |--------------------------------------------------------------------------
  */
  titleCell.value =
    `Turma - ${turma.activity_title} - ${activityDayText} - ${turma.activity_time_start} às ${turma.activity_time_end} - ${ano}`;

  /*
  |--------------------------------------------------------------------------
  | Title styles
  |--------------------------------------------------------------------------
  */
  titleCell.font = {
    bold: true,
    size: 14,
    name: "Arial",
    color: { argb: "FF1F1F1F" },
  };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFA9D08E" },
  };
  titleCell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  /*
  |--------------------------------------------------------------------------
  | Increase title row height
  |--------------------------------------------------------------------------
  */
  sheet.getRow(1).height = 25;

  /*
  |--------------------------------------------------------------------------
  | Create header row
  |--------------------------------------------------------------------------
  |
  | Example:
  | Matrícula | Aluno | 03/mai | 10/mai
  |
  */
  sheet.addRow([
    "Matrícula",
    "Aluno",
    ...dias.map(
      (d) => `${String(d).padStart(2, "0")}/${monthNames[mes - 1]}`
    )
  ]);

  /*
  |--------------------------------------------------------------------------
  | Add students rows
  |--------------------------------------------------------------------------
  */
  alunos.forEach((aluno) => {
    sheet.addRow([
      aluno.matricula,
      aluno.nome,
      /*
      |--------------------------------------------------------------------------
      | Empty attendance cells
      |--------------------------------------------------------------------------
      */
      ...dias.map(() => ""),
    ]);
  });

  /*
  |--------------------------------------------------------------------------
  | Add extra empty rows
  |--------------------------------------------------------------------------
  |
  | Useful for:
  | - New students
  | - Manual notes
  | - Better printing layout
  |
  */
  for (let i = 0; i < 5; i++) {
    sheet.addRow([
      "",
      "",
      ...dias.map(() => ""),
    ]);
  }

  /*
  |--------------------------------------------------------------------------
  | Set columns width
  |--------------------------------------------------------------------------
  */
  sheet.columns = [
    { width: 14 },
    { width: 40 },
    ...dias.map(() => ({ width: 12 })),
  ];

  /*
  |--------------------------------------------------------------------------
  | Header row styles
  |--------------------------------------------------------------------------
  */
  const headerRow = sheet.getRow(2);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EFDA" },
    };
    cell.font = {
      bold: true,
      color: { argb: "FF000000" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /*
  |--------------------------------------------------------------------------
  | Apply borders to entire table
  |--------------------------------------------------------------------------
  */
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        vertical: "middle",
      };
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Center attendance columns
  |--------------------------------------------------------------------------
  */

  for (let col = 3; col <= totalColumns; col++) {
    sheet.getColumn(col).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Excel print settings
  |--------------------------------------------------------------------------
  |
  | Landscape:
  | Horizontal printing
  |
  */
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  /*
  |--------------------------------------------------------------------------
  | Generate file buffer
  |--------------------------------------------------------------------------
  */
  const buffer = await workbook.xlsx.writeBuffer();

  /*
  |--------------------------------------------------------------------------
  | Download generated file
  |--------------------------------------------------------------------------
  */
  saveAs(
    new Blob([buffer]),
    `Lista_${turma.activity_title}.xlsx`
  );
}