import type { getEvaluationResults } from "../actions";

type EvaluationResults = NonNullable<
  Awaited<ReturnType<typeof getEvaluationResults>>
>;

const BOM = "\uFEFF";

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatScore(score: number | null): string {
  return score != null ? score.toFixed(1) : "";
}

function formatDate(date: Date | null): string {
  return date != null ? new Date(date).toISOString().slice(0, 10) : "";
}

export function buildResultsCsv(results: EvaluationResults): string {
  const {
    evaluation,
    assignments,
    overallAverageScore,
    completedCount,
    totalAssignments,
    iap,
    irto,
  } = results;

  const rows: string[] = [];

  rows.push(`${csvField("Evaluación")},${csvField(evaluation.title)}`);
  rows.push(`${csvField("Cargo")},${csvField(evaluation.positionName)}`);
  rows.push(
    `${csvField("Puntaje promedio")},${csvField(overallAverageScore.toFixed(1))}`,
  );
  rows.push(`${csvField("IAP")},${csvField(`${iap}%`)}`);
  rows.push(`${csvField("IRTO")},${csvField(`${irto}%`)}`);
  rows.push(
    `${csvField("Completadas")},${csvField(`${completedCount} de ${totalAssignments}`)}`,
  );
  rows.push("");

  rows.push(
    [
      csvField("Empleado"),
      csvField("Email"),
      csvField("Estado"),
      csvField("Puntaje"),
      csvField("Completada el"),
    ].join(","),
  );

  for (const a of assignments) {
    rows.push(
      [
        csvField(a.employee.name),
        csvField(a.employee.email),
        csvField(a.status),
        csvField(formatScore(a.score)),
        csvField(formatDate(a.completedAt)),
      ].join(","),
    );
  }

  return `${BOM + rows.join("\r\n")}\r\n`;
}
