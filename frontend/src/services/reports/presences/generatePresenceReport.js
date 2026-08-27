import { generateExcelPresences } from "./excelPresences";
import { generatePdfPresences } from "./pdfPresences";
import { generatePrintPresences } from "./printPresences";


export function generatePresenceReport({ formato, turma, alunos, mes, ano }) {
	if (formato === "excel") {
		return generateExcelPresences({ turma, alunos, mes, ano });
	}

	if (formato === "pdf") {
		return generatePdfPresences({ turma, alunos, mes, ano });
	}

	if (formato === "print") {
		return generatePrintPresences({ turma, alunos, mes, ano });
	}
}