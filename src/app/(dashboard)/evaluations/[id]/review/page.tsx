"use client";

import { use } from "react";
import { useSession } from "@/features/auth/hooks/use-session";
import { QuestionReviewCard } from "@/features/evaluations/components/question-review-card";
import { ReviewSummaryBar } from "@/features/evaluations/components/review-summary-bar";
import {
  useActivateEvaluation,
  useEvaluation,
  useResolveCalibration,
  useSubmitReview,
  useUpdateQuestionStatus,
  useUpdateQuestionText,
} from "@/features/evaluations/queries";
import type { EvaluationStatus } from "@/generated/prisma/client";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data: evaluation, isLoading } = useEvaluation(id);

  const updateStatus = useUpdateQuestionStatus();
  const updateText = useUpdateQuestionText();
  const submitReview = useSubmitReview();
  const resolveCalibration = useResolveCalibration();
  const activateEval = useActivateEvaluation();

  const role = session?.user?.role;

  // Role guard — HR, AREA_LEAD y ADMIN pueden revisar
  if (role !== "ADMIN" && role !== "HR" && role !== "AREA_LEAD") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para revisar evaluaciones
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargando evaluación...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Evaluación no encontrada
      </div>
    );
  }

  const questions = evaluation.questions ?? [];
  const reviewedCount = questions.filter(
    (q) => q.status === "APPROVED" || q.status === "EDITED",
  ).length;
  const pendingCount = questions.filter((q) => q.status === "PENDING").length;
  const rejectedCount = questions.filter((q) => q.status === "REJECTED").length;

  const hrReviewsCount = questions.filter((q) =>
    q.reviews.some((r) => r.reviewerRole === "HR"),
  ).length;
  const leadReviewsCount = questions.filter((q) =>
    q.reviews.some((r) => r.reviewerRole === "AREA_LEAD"),
  ).length;
  const resolvedCount = questions.filter(
    (q) => q.calibrationStatus === "RESOLVED",
  ).length;

  // Activación: todas aprobadas/editadas Y calibradas (RESOLVED)
  const canActivate =
    pendingCount === 0 &&
    rejectedCount === 0 &&
    questions.every((q) => q.calibrationStatus === "RESOLVED");

  // Promedios desde el consenso
  const ratedQuestions = questions.filter((q) => q.consensus !== null);

  const averageRatings =
    ratedQuestions.length > 0
      ? {
          relevance:
            ratedQuestions.reduce(
              (s, q) => s + (q.consensus?.relevanceRating ?? 0),
              0,
            ) / ratedQuestions.length,
          coherence:
            ratedQuestions.reduce(
              (s, q) => s + (q.consensus?.coherenceRating ?? 0),
              0,
            ) / ratedQuestions.length,
          adequacy:
            ratedQuestions.reduce(
              (s, q) => s + (q.consensus?.adequacyRating ?? 0),
              0,
            ) / ratedQuestions.length,
        }
      : null;

  // El rol del revisor actual: AREA_LEAD manda su slot, HR/ADMIN mandan RRHH
  const reviewerRole = role === "AREA_LEAD" ? "AREA_LEAD" : "HR";
  const canResolveCalibration = role === "ADMIN" || role === "HR";

  return (
    <div className="flex flex-col gap-4">
      <ReviewSummaryBar
        evaluationTitle={evaluation.title}
        positionName={evaluation.position?.name ?? ""}
        status={evaluation.status as EvaluationStatus}
        totalQuestions={questions.length}
        reviewedCount={reviewedCount}
        pendingCount={pendingCount}
        hrReviewsCount={hrReviewsCount}
        leadReviewsCount={leadReviewsCount}
        resolvedCount={resolvedCount}
        averageRatings={averageRatings}
        canActivate={canActivate}
        onActivate={() => activateEval.mutate(id)}
        isActivating={activateEval.isPending}
        role={role}
      />

      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <QuestionReviewCard
            key={q.id}
            question={q}
            reviewerRole={reviewerRole}
            onApprove={(qId) =>
              updateStatus.mutate({ id: qId, status: "APPROVED" })
            }
            onReject={(qId) =>
              updateStatus.mutate({ id: qId, status: "REJECTED" })
            }
            onUpdateText={(qId, text) => updateText.mutate({ id: qId, text })}
            onSubmitReview={(qId, ratings) =>
              submitReview.mutate({ id: qId, ...ratings })
            }
            {...(canResolveCalibration
              ? {
                  onResolveCalibration: (qId, final) =>
                    resolveCalibration.mutate({ id: qId, ...final }),
                }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
