import * as XLSX from "xlsx";
import type { getEvaluationResults } from "../actions";

type EvaluationResults = NonNullable<
  Awaited<ReturnType<typeof getEvaluationResults>>
>;

export function buildResultsWorkbook(
  results: EvaluationResults,
): XLSX.WorkBook {
  const {
    evaluation,
    assignments,
    overallAverageScore,
    completedCount,
    totalAssignments,
    iap,
    irto,
  } = results;

  const rows: (string | number | Date | null)[][] = [
    ["Evaluación", evaluation.title],
    ["Cargo", evaluation.positionName],
    ["Puntaje promedio", overallAverageScore],
    ["IAP", `${iap}%`],
    ["IRTO", `${irto}%`],
    ["Completadas", `${completedCount} de ${totalAssignments}`],
    [],
    ["Empleado", "Email", "Estado", "Puntaje", "Completada el"],
    ...assignments.map((a) => [
      a.employee.name,
      a.employee.email,
      a.status,
      a.score,
      a.completedAt ? new Date(a.completedAt) : null,
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  sheet["!cols"] = [
    { wch: 30 },
    { wch: 28 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Resultados");
  return workbook;
}

export function downloadResultsXlsx(results: EvaluationResults): void {
  const workbook = buildResultsWorkbook(results);
  const filename = `resultados-${results.evaluation.title
    .replace(/[^\w\dáéíóúñ-]+/gi, "-")
    .toLowerCase()}.xlsx`;
  // bookSST forces real shared-string cells (t="s") instead of the
  // non-standard t="str" cells the writer emits by default, which some
  // Excel versions flag as corrupted/unreadable content.
  XLSX.writeFile(workbook, filename, { bookSST: true });
}
