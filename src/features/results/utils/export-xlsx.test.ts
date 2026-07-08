import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { getEvaluationResults } from "../actions";
import { buildResultsWorkbook } from "./export-xlsx";

type EvaluationResults = NonNullable<
  Awaited<ReturnType<typeof getEvaluationResults>>
>;

type Assignment = EvaluationResults["assignments"][number];

const defaultAssignment: Assignment = {
  id: "asg-1",
  status: "COMPLETED",
  score: 4.2,
  completedAt: new Date("2026-07-01T12:00:00.000Z"),
  evaluationId: "eval-1",
  employeeId: "emp-1",
  evaluatorId: "evr-1",
  createdAt: new Date("2026-06-01T12:00:00.000Z"),
  updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  employee: { id: "emp-1", name: "Ana Pérez", email: "ana@example.com" },
} as Assignment;

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return { ...defaultAssignment, ...overrides } as Assignment;
}

const defaultResults: EvaluationResults = {
  evaluation: {
    id: "eval-1",
    title: "Evaluación de Desempeño",
    status: "ACTIVE",
    positionName: "Desarrollador",
    generationTime: 60,
  },
  assignments: [],
  questions: [],
  overallAverageScore: 4.2,
  completedCount: 0,
  totalAssignments: 0,
  iap: 100,
  iapRatedCount: 0,
  irto: 99,
  irtoGenerationMinutes: 1,
  irtoManualMinutes: 120,
} as EvaluationResults;

function makeResults(
  overrides: Partial<EvaluationResults> = {},
): EvaluationResults {
  return { ...defaultResults, ...overrides } as EvaluationResults;
}

function sheetRows(results: EvaluationResults): unknown[][] {
  const workbook = buildResultsWorkbook(results);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true });
}

describe("buildResultsWorkbook", () => {
  it("names the sheet 'Resultados'", () => {
    const workbook = buildResultsWorkbook(makeResults());
    expect(workbook.SheetNames).toEqual(["Resultados"]);
  });

  it("emits the metadata block and table header for zero assignments", () => {
    const rows = sheetRows(makeResults());
    expect(rows[0]).toEqual(["Evaluación", "Evaluación de Desempeño"]);
    expect(rows[1]).toEqual(["Cargo", "Desarrollador"]);
    expect(rows[2]).toEqual(["Puntaje promedio", 4.2]);
    expect(rows[3]).toEqual(["IAP", "100%"]);
    expect(rows[4]).toEqual(["IRTO", "99%"]);
    expect(rows[5]).toEqual(["Completadas", "0 de 0"]);
    expect(rows[7]).toEqual([
      "Empleado",
      "Email",
      "Estado",
      "Puntaje",
      "Completada el",
    ]);
  });

  it("emits one data row per assignment", () => {
    const rows = sheetRows(
      makeResults({
        assignments: [
          makeAssignment({ id: "a1" }),
          makeAssignment({ id: "a2" }),
        ],
      }),
    );
    expect(rows[8]?.[0]).toBe("Ana Pérez");
    expect(rows[9]?.[0]).toBe("Ana Pérez");
  });

  it("keeps the score as a real number, not a formatted string", () => {
    const rows = sheetRows(
      makeResults({
        assignments: [makeAssignment({ score: 3.85 })],
      }),
    );
    expect(rows[8]?.[3]).toBe(3.85);
  });

  it("omits the score cell when score is null", () => {
    const rows = sheetRows(
      makeResults({
        assignments: [
          makeAssignment({ score: null, status: "PENDING", completedAt: null }),
        ],
      }),
    );
    expect(rows[8]?.[2]).toBe("PENDING");
    expect(rows[8]?.[3]).toBeUndefined();
  });

  it("writes completedAt as a real Excel date cell, not a string", () => {
    const workbook = buildResultsWorkbook(
      makeResults({
        assignments: [
          makeAssignment({
            completedAt: new Date("2026-07-05T15:30:00.000Z"),
          }),
        ],
      }),
    );
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // Row 9 (1-indexed) = data row for the assignment, column E = "Completada el"
    expect(sheet.E9?.t).toBe("d");
    expect(sheet.E9?.v).toBeInstanceOf(Date);
  });

  it("omits the date cell when completedAt is null", () => {
    const rows = sheetRows(
      makeResults({
        assignments: [
          makeAssignment({ completedAt: null, status: "IN_PROGRESS" }),
        ],
      }),
    );
    expect(rows[8]?.[2]).toBe("IN_PROGRESS");
    expect(rows[8]?.[4]).toBeUndefined();
  });
});
