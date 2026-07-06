import { describe, expect, it } from "vitest";
import { GenerarEvaluacionResponseSchema } from "@/lib/validators/rag";

function validFixture() {
  return {
    cargo: "Desarrollador Backend",
    enfoque: "Desempeño general de funciones y responsabilidades",
    preguntas: {
      cargo: "Desarrollador Backend",
      preguntas: [
        {
          numero: 1,
          pilar: " Técnico",
          afirmacion: "Implementa endpoints REST siguiendo buenas prácticas.",
          manual_referencia: "manual-desarrollador.md",
          guia_evaluacion_min_max: "1 (nunca) — 5 (siempre)",
        },
        {
          numero: 2,
          pilar: "Interpersonal",
          afirmacion: "Colabora con el equipo en revisiones de código.",
          manual_referencia: "manual-desarrollador.md",
          guia_evaluacion_min_max: "1 (nunca) — 5 (siempre)",
        },
      ],
      metadata: {
        proveedor: "ollama",
        modelo: "llama3.1",
        tiempo_ejecucion_segundos: 42.5,
        tokens_entrada: 1500,
        tokens_salida: 3200,
        tokens_totales: 4700,
      },
    },
  };
}

describe("GenerarEvaluacionResponseSchema", () => {
  it("accepts a fixture matching the real RAG contract", () => {
    const parsed = GenerarEvaluacionResponseSchema.safeParse(validFixture());
    expect(parsed.success).toBe(true);
  });

  it("rejects a pregunta missing `afirmacion`", () => {
    const fixture = validFixture();
    // @ts-expect-error intentionally removing a required field
    delete fixture.preguntas.preguntas[0].afirmacion;
    const parsed = GenerarEvaluacionResponseSchema.safeParse(fixture);
    expect(parsed.success).toBe(false);
  });

  it("rejects a payload missing the outer `cargo`", () => {
    const fixture = validFixture();
    // @ts-expect-error intentionally removing a required field
    delete fixture.cargo;
    const parsed = GenerarEvaluacionResponseSchema.safeParse(fixture);
    expect(parsed.success).toBe(false);
  });

  it("rejects a payload with an incomplete metadata block", () => {
    const fixture = validFixture();
    // @ts-expect-error intentionally removing a required field
    delete fixture.preguntas.metadata.tiempo_ejecucion_segundos;
    const parsed = GenerarEvaluacionResponseSchema.safeParse(fixture);
    expect(parsed.success).toBe(false);
  });
});
