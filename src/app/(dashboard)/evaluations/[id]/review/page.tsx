"use client";

import { use } from "react";
import { useSession } from "@/features/auth/hooks/use-session";
import { QuestionReviewCard } from "@/features/evaluations/components/question-review-card";
import { ReviewSummaryBar } from "@/features/evaluations/components/review-summary-bar";
import {
  useActivateEvaluation,
  useEvaluation,
  useRateQuestion,
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
  const rateQuestion = useRateQuestion();
  const activateEval = useActivateEvaluation();

  // Role guard
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
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

  const canActivate = pendingCount === 0 && rejectedCount === 0;

  // Calculate average ratings
  const ratedQuestions = questions.filter(
    (q) =>
      q.relevanceRating != null &&
      q.coherenceRating != null &&
      q.adequacyRating != null,
  );

  const averageRatings =
    ratedQuestions.length > 0
      ? {
          relevance:
            ratedQuestions.reduce((s, q) => s + (q.relevanceRating ?? 0), 0) /
            ratedQuestions.length,
          coherence:
            ratedQuestions.reduce((s, q) => s + (q.coherenceRating ?? 0), 0) /
            ratedQuestions.length,
          adequacy:
            ratedQuestions.reduce((s, q) => s + (q.adequacyRating ?? 0), 0) /
            ratedQuestions.length,
        }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <ReviewSummaryBar
        evaluationTitle={evaluation.title}
        positionName={evaluation.position?.name ?? ""}
        status={evaluation.status as EvaluationStatus}
        totalQuestions={questions.length}
        reviewedCount={reviewedCount}
        pendingCount={pendingCount}
        averageRatings={averageRatings}
        canActivate={canActivate}
        onActivate={() => activateEval.mutate(id)}
        isActivating={activateEval.isPending}
      />

      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <QuestionReviewCard
            key={q.id}
            question={q}
            onApprove={(qId) =>
              updateStatus.mutate({ id: qId, status: "APPROVED" })
            }
            onReject={(qId) =>
              updateStatus.mutate({ id: qId, status: "REJECTED" })
            }
            onUpdateText={(qId, text) => updateText.mutate({ id: qId, text })}
            onRate={(qId, ratings) =>
              rateQuestion.mutate({ id: qId, ...ratings })
            }
          />
        ))}
      </div>
    </div>
  );
}
