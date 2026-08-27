/*
|--------------------------------------------------------------------------
| Imports
|--------------------------------------------------------------------------
|
| jsPDF:
| Library responsible for creating PDF files in the browser.
|
| autoTable:
| Plugin responsible for creating tables inside the PDF.
|
| selectOptions:
| Object containing the application's select options.
| Used here to convert activity_days number into readable text.
|
*/

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { selectOptions } from "../../../utils/userSelectOptions";

/*
|--------------------------------------------------------------------------
| Function: generatePdfPresences
|--------------------------------------------------------------------------
|
| Responsible for generating the attendance list PDF file.
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

export function generatePdfPresences({
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
	| Calculate days of selected month
	|--------------------------------------------------------------------------
	*/

	const diasDoMes = new Date(ano, mes, 0).getDate();

	/*
	|--------------------------------------------------------------------------
	| Array that stores valid attendance days
	|--------------------------------------------------------------------------
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
	*/

	for (let dia = 1; dia <= diasDoMes; dia++) {
		const data = new Date(ano, mes - 1, dia);

		if (data.getDay() === Number(turma.activity_days) - 1) {
			dias.push(dia);
		}
	}

	/*
	|--------------------------------------------------------------------------
	| Create PDF document
	|--------------------------------------------------------------------------
	|
	| landscape -> horizontal page
	| pt        -> unit in points
	| a4        -> paper size
	|
	*/

	const doc = new jsPDF({
		orientation: "landscape",
		unit: "pt",
		format: "a4",
	});

	/*
	|--------------------------------------------------------------------------
	| Create table header
	|--------------------------------------------------------------------------
	*/

	const head = [[
		"Matrícula",
		"Aluno",
		...dias.map(
			(d) => `${String(d).padStart(2, "0")}/${monthNames[mes - 1]}`
		)
	]];

	/*
	|--------------------------------------------------------------------------
	| Create table body
	|--------------------------------------------------------------------------
	*/

	const body = alunos.map((aluno) => [
		aluno.matricula,
		aluno.nome,
		...dias.map(() => ""),
	]);

	/*
	|--------------------------------------------------------------------------
	| Add extra empty rows
	|--------------------------------------------------------------------------
	*/

	for (let i = 0; i < 5; i++) {
		body.push([
			"",
			"",
			...dias.map(() => ""),
		]);
	}

	/*
	|--------------------------------------------------------------------------
	| Main title content
	|--------------------------------------------------------------------------
	*/

	const title =
		`Turma - ${turma.activity_title} - ${activityDayText} - ${turma.activity_time_start} às ${turma.activity_time_end} - ${ano}`;

	/*
	|--------------------------------------------------------------------------
	| Draw title background
	|--------------------------------------------------------------------------
	*/

	doc.setFillColor(169, 208, 142);
	doc.rect(40, 30, doc.internal.pageSize.getWidth() - 80, 25, "F");

	/*
	|--------------------------------------------------------------------------
	| Draw title text
	|--------------------------------------------------------------------------
	*/

	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.setTextColor(31, 31, 31);
	doc.text(title, doc.internal.pageSize.getWidth() / 2, 47, {
		align: "center",
	});

	/*
	|--------------------------------------------------------------------------
	| Generate PDF table
	|--------------------------------------------------------------------------
	*/

	autoTable(doc, {
		head,
		body,
		startY: 55,

		theme: "grid",

		styles: {
			font: "helvetica",
			fontSize: 8,
			cellPadding: 4,
			lineColor: [0, 0, 0],
			lineWidth: 0.5,
			valign: "middle",
		},

		headStyles: {
			fillColor: [226, 239, 218],
			textColor: [0, 0, 0],
			fontStyle: "bold",
			halign: "center",
		},

		columnStyles: {
			0: {
				cellWidth: 70,
				halign: "center",
			},
			1: {
				cellWidth: 220,
				halign: "left",
			},
		},

		bodyStyles: {
			minCellHeight: 18,
		},
	});

	/*
	|--------------------------------------------------------------------------
	| Download generated PDF
	|--------------------------------------------------------------------------
	*/

	doc.save(`Lista_${turma.activity_title}.pdf`);
}