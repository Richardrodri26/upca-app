import { describe, expect, it } from "vitest";
import type { getEvaluationResults } from "../actions";
import { buildResultsCsv } from "./export-csv";

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

describe("buildResultsCsv", () => {
  it("prefixes the CSV with a UTF-8 BOM", () => {
    const csv = buildResultsCsv(makeResults());
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("emits the metadata header block and table header for zero assignments", () => {
    const csv = buildResultsCsv(makeResults());
    const body = csv.replace(/^\uFEFF/, "");
    const lines = body.split("\r\n");
    expect(lines[0]).toBe('"Evaluación","Evaluación de Desempeño"');
    expect(lines[1]).toBe('"Cargo","Desarrollador"');
    expect(lines[2]).toBe('"Puntaje promedio","4.2"');
    expect(lines[3]).toBe('"IAP","100%"');
    expect(lines[4]).toBe('"IRTO","99%"');
    expect(lines[5]).toBe('"Completadas","0 de 0"');
    expect(lines[6]).toBe("");
    expect(lines[7]).toBe(
      '"Empleado","Email","Estado","Puntaje","Completada el"',
    );
  });

  it("emits one data row per assignment", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({ id: "a1" }),
          makeAssignment({ id: "a2" }),
        ],
      }),
    );
    const body = csv.replace(/^\uFEFF/, "");
    const lines = body.split("\r\n");
    // 6 metadata + 1 blank + 1 header + 2 assignments + 1 trailing = 11
    expect(lines).toHaveLength(11);
    expect(lines[8]).toContain("Ana Pérez");
    expect(lines[9]).toContain("Ana Pérez");
  });

  it("row count equals assignments plus header lines", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({ id: "a1" }),
          makeAssignment({ id: "a2" }),
          makeAssignment({ id: "a3" }),
        ],
      }),
    );
    const body = csv.replace(/^\uFEFF/, "");
    const lines = body.split("\r\n");
    // 6 metadata + 1 blank + 1 table header + 3 assignments + 1 trailing = 12
    expect(lines).toHaveLength(12);
  });

  it("escapes commas in field values", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({
            employee: {
              id: "emp-1",
              name: "Pérez, Ana María",
              email: "ana@example.com",
            },
          }),
        ],
      }),
    );
    expect(csv).toContain('"Pérez, Ana María"');
  });

  it("escapes double quotes in field values by doubling them", () => {
    const csv = buildResultsCsv(
      makeResults({
        evaluation: {
          ...defaultResults.evaluation,
          title: 'Evaluación "Q3" 2026',
        },
      }),
    );
    expect(csv).toContain('"Evaluación ""Q3"" 2026"');
  });

  it("preserves newlines inside quoted fields", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({
            employee: {
              id: "emp-1",
              name: "Ana\nPérez",
              email: "ana@example.com",
            },
          }),
        ],
      }),
    );
    expect(csv).toContain('"Ana\nPérez"');
  });

  it("emits an empty score cell when score is null", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({ score: null, status: "PENDING", completedAt: null }),
        ],
      }),
    );
    const body = csv.replace(/^\uFEFF/, "");
    const lines = body.split("\r\n");
    const dataLine = lines[8];
    expect(dataLine).toContain('"PENDING"');
    expect(dataLine).toContain('""');
  });

  it("emits an empty date cell when completedAt is null", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({ completedAt: null, status: "IN_PROGRESS" }),
        ],
      }),
    );
    const body = csv.replace(/^\uFEFF/, "");
    const lines = body.split("\r\n");
    const dataLine = lines[8];
    expect(dataLine).toContain('"IN_PROGRESS"');
    // The last field (date) should be an empty quoted string
    expect(dataLine.endsWith('""')).toBe(true);
  });

  it("formats dates as ISO yyyy-mm-dd", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [
          makeAssignment({
            completedAt: new Date("2026-07-05T15:30:00.000Z"),
          }),
        ],
      }),
    );
    expect(csv).toContain("2026-07-05");
  });

  it("formats scores with one decimal place", () => {
    const csv = buildResultsCsv(
      makeResults({
        assignments: [makeAssignment({ score: 3.85 })],
      }),
    );
    expect(csv).toContain('"3.9"');
  });
});
