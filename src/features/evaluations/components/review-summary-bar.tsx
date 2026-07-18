"use client";

import { Button } from "@/components/ui/button";
import type { EvaluationStatus } from "@/generated/prisma/client";
import { EvaluationStatusBadge } from "./evaluation-status-badge";

type ReviewSummaryBarProps = {
  evaluationTitle: string;
  positionName: string;
  status: EvaluationStatus;
  totalQuestions: number;
  reviewedCount: number;
  pendingCount: number;
  hrReviewsCount: number;
  leadReviewsCount: number;
  resolvedCount: number;
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
  hrReviewsCount,
  leadReviewsCount,
  resolvedCount,
  averageRatings,
  canActivate,
  onActivate,
  isActivating,
}: ReviewSummaryBarProps) {
  const progress =
    totalQuestions > 0 ? (reviewedCount / totalQuestions) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 bg-background border-b pb-4 -mx-4 px-4 pt-4 sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {evaluationTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{positionName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

      {/* Calibration counters */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
        <span>
          RRHH:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {hrReviewsCount}/{totalQuestions}
          </span>
        </span>
        <span>
          Líderes:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {leadReviewsCount}/{totalQuestions}
          </span>
        </span>
        <span>
          Consensos:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {resolvedCount}/{totalQuestions}
          </span>
        </span>
      </div>

      {/* Average ratings (from consensus) */}
      {averageRatings && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
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
