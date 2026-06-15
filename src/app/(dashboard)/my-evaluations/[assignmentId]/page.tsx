"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAssignment, useSubmitResponse, useCompleteAssignment } from "@/features/assignments/queries";
import { LikertQuestion } from "@/features/assignments/components/likert-question";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResponsePage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = use(params);
  const router = useRouter();
  const { data: assignment, isLoading } = useAssignment(assignmentId);
  const submitMutation = useSubmitResponse();
  const completeMutation = useCompleteAssignment();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResponse = useCallback(
    (questionId: string, value: number) => {
      submitMutation.mutate({ assignmentId, questionId, value });
    },
    [assignmentId, submitMutation],
  );

  const handleComplete = async () => {
    const result = await completeMutation.mutateAsync(assignmentId);
    if (result.success) {
      router.push("/my-evaluations");
    }
    setShowConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargando evaluación...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Asignación no encontrada
      </div>
    );
  }

  const questions = assignment.evaluation.questions;
  const responses = assignment.responses;
  const responseMap = new Map(responses.map((r) => [r.questionId, r.value]));

  const totalQuestions = questions.length;
  const answeredCount = responseMap.size;
  const isComplete = assignment.status === "COMPLETED";
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const allAnswered = answeredCount === totalQuestions;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {assignment.evaluation.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {assignment.evaluation.position.name}
        </p>
        {!isComplete && (
          <p className="text-sm text-muted-foreground mt-2">
            Responda cada pregunta seleccionando la opción que mejor describe el
            desempeño. Sus respuestas se guardan automáticamente.
          </p>
        )}
        {isComplete && (
          <p className="text-sm font-medium text-primary mt-2">
            Evaluación completada — Puntaje:{" "}
            {assignment.score?.toFixed(1) ?? "—"}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progress < 33
                ? "bg-destructive"
                : progress < 66
                  ? "bg-yellow-500"
                  : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {answeredCount} de {totalQuestions}
        </span>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preguntas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          {questions.map((q, i) => (
            <LikertQuestion
              key={q.id}
              number={i + 1}
              text={q.text}
              value={responseMap.get(q.id) ?? null}
              onChange={(value) => handleResponse(q.id, value)}
              readOnly={isComplete}
            />
          ))}
        </CardContent>
      </Card>

      {/* Sticky bottom bar */}
      {!isComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end gap-3 z-10">
          <Button variant="outline" onClick={() => router.push("/my-evaluations")}>
            Guardar y Salir
          </Button>
          {showConfirm ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? "Finalizando..." : "Confirmar"}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!allAnswered}
              title={!allAnswered ? "Responda todas las preguntas para finalizar" : undefined}
            >
              Finalizar Evaluación
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
