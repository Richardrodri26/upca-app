"use client";

import { Button } from "@/components/ui/button";
import { EvaluationStatusBadge } from "./evaluation-status-badge";
import type { QuestionStatus, EvaluationStatus } from "@/generated/prisma/client";

type ReviewSummaryBarProps = {
  evaluationTitle: string;
  positionName: string;
  status: EvaluationStatus;
  totalQuestions: number;
  reviewedCount: number;
  pendingCount: number;
  averageRatings: {
    relevance: number;
    coherence: number;
    adequacy: number;
  } | null;
  canActivate: boolean;
  onActivate: () => void;
  isActivating: boolean;
};

export function ReviewSummaryBar({
  evaluationTitle,
  positionName,
  status,
  totalQuestions,
  reviewedCount,
  pendingCount,
  averageRatings,
  canActivate,
  onActivate,
  isActivating,
}: ReviewSummaryBarProps) {
  const progress = totalQuestions > 0 ? (reviewedCount / totalQuestions) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 bg-background border-b pb-4 -mx-6 px-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {evaluationTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{positionName}</p>
        </div>
        <div className="flex items-center gap-3">
          <EvaluationStatusBadge status={status} />
          {status === "REVIEW" && (
            <Button
              size="sm"
              onClick={onActivate}
              disabled={!canActivate || isActivating}
            >
              {isActivating ? "Activando..." : "Activar Evaluación"}
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {reviewedCount} de {totalQuestions} revisadas
        </span>
      </div>

      {pendingCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""} — Todas deben
          ser aprobadas o editadas para activar
        </p>
      )}

      {/* Average ratings */}
      {averageRatings && (
        <div className="flex gap-6 mt-3 text-sm">
          <span>
            <span className="text-muted-foreground">Pertinencia: </span>
            <span className="font-medium tabular-nums">
              {averageRatings.relevance.toFixed(1)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Coherencia: </span>
            <span className="font-medium tabular-nums">
              {averageRatings.coherence.toFixed(1)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Adecuación: </span>
            <span className="font-medium tabular-nums">
              {averageRatings.adequacy.toFixed(1)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
