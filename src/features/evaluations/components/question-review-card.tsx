"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  ConsensusInput,
  ReviewQuestionInput,
} from "@/features/evaluations/validators";
import type { QuestionStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { QuestionStatusBadge } from "./evaluation-status-badge";

type Review = {
  reviewerRole: "HR" | "AREA_LEAD";
  reviewerId: string;
  relevanceRating: number;
  coherenceRating: number;
  adequacyRating: number;
};

type Consensus = {
  relevanceRating: number;
  coherenceRating: number;
  adequacyRating: number;
};

type QuestionData = {
  id: string;
  text: string;
  order: number;
  status: QuestionStatus;
  originalText: string | null;
  pillar: string | null;
  manualReference: string | null;
  scoringGuide: string | null;
  reviews: Review[];
  consensus: Consensus | null;
  calibrationStatus: "PENDING" | "IN_CALIBRATION" | "RESOLVED";
};

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = value === star;
          return (
            <button
              key={star}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(star)}
              className={cn(
                "h-7 w-7 rounded-md text-sm font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted-foreground/20",
              )}
            >
              {star}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RatingRead({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = value === star;
          return (
            <span
              key={star}
              className={cn(
                "h-7 w-7 rounded-md text-sm font-medium flex items-center justify-center",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground",
              )}
            >
              {star}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type ReviewerPanelProps = {
  title: string;
  review: Review | undefined;
  editable: boolean;
  onSubmit: (ratings: ReviewQuestionInput) => void;
};

function ReviewerPanel({
  title,
  review,
  editable,
  onSubmit,
}: ReviewerPanelProps) {
  const [relevance, setRelevance] = useState<number | null>(
    review?.relevanceRating ?? null,
  );
  const [coherence, setCoherence] = useState<number | null>(
    review?.coherenceRating ?? null,
  );
  const [adequacy, setAdequacy] = useState<number | null>(
    review?.adequacyRating ?? null,
  );

  const canSubmit =
    relevance !== null && coherence !== null && adequacy !== null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      relevanceRating: relevance,
      coherenceRating: coherence,
      adequacyRating: adequacy,
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {review ? (
          <span className="text-xs text-muted-foreground">Completada</span>
        ) : editable ? (
          <span className="text-xs text-muted-foreground">Tu revisión</span>
        ) : (
          <span className="text-xs text-muted-foreground">Pendiente</span>
        )}
      </div>

      {editable ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-4">
            <RatingSelector
              label="Pertinencia"
              value={relevance}
              onChange={setRelevance}
            />
            <RatingSelector
              label="Coherencia"
              value={coherence}
              onChange={setCoherence}
            />
            <RatingSelector
              label="Adecuación"
              value={adequacy}
              onChange={setAdequacy}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {review ? "Actualizar revisión" : "Enviar revisión"}
          </Button>
        </div>
      ) : review ? (
        <div className="flex flex-wrap gap-4">
          <RatingRead label="Pertinencia" value={review.relevanceRating} />
          <RatingRead label="Coherencia" value={review.coherenceRating} />
          <RatingRead label="Adecuación" value={review.adequacyRating} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Pendiente</p>
      )}
    </div>
  );
}

type QuestionReviewCardProps = {
  question: QuestionData;
  reviewerRole: "HR" | "AREA_LEAD";
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onSubmitReview: (id: string, ratings: ReviewQuestionInput) => void;
  onResolveCalibration?: (id: string, final: ConsensusInput) => void;
};

export function QuestionReviewCard({
  question,
  reviewerRole,
  onApprove,
  onReject,
  onUpdateText,
  onSubmitReview,
  onResolveCalibration,
}: QuestionReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [calRelevance, setCalRelevance] = useState<number | null>(
    question.consensus?.relevanceRating ?? null,
  );
  const [calCoherence, setCalCoherence] = useState<number | null>(
    question.consensus?.coherenceRating ?? null,
  );
  const [calAdequacy, setCalAdequacy] = useState<number | null>(
    question.consensus?.adequacyRating ?? null,
  );

  const hasOriginal = question.originalText && question.status === "EDITED";

  const hrReview = question.reviews.find((r) => r.reviewerRole === "HR");
  const leadReview = question.reviews.find(
    (r) => r.reviewerRole === "AREA_LEAD",
  );

  const handleSaveEdit = () => {
    if (editText.trim().length >= 10 && editText !== question.text) {
      onUpdateText(question.id, editText.trim());
    }
    setEditing(false);
  };

  const handleSubmitReview = (ratings: ReviewQuestionInput) => {
    onSubmitReview(question.id, ratings);
  };

  const handleResolveCalibration = () => {
    if (
      calRelevance === null ||
      calCoherence === null ||
      calAdequacy === null ||
      !onResolveCalibration
    ) {
      return;
    }
    onResolveCalibration(question.id, {
      relevanceRating: calRelevance,
      coherenceRating: calCoherence,
      adequacyRating: calAdequacy,
    });
  };

  const canResolveCalibration =
    calRelevance !== null && calCoherence !== null && calAdequacy !== null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground tabular-nums">
              {question.order}.
            </span>
            <QuestionStatusBadge status={question.status} />
            {question.pillar && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {question.pillar}
              </span>
            )}
            {question.calibrationStatus === "IN_CALIBRATION" && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                Calibración
              </span>
            )}
            {question.calibrationStatus === "RESOLVED" && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                Consenso
              </span>
            )}
          </div>
          {question.manualReference && (
            <span className="text-xs text-muted-foreground pl-6">
              Ref: {question.manualReference}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {question.status !== "APPROVED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApprove(question.id)}
            >
              Aprobar
            </Button>
          )}
          {question.status !== "REJECTED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(question.id)}
            >
              Rechazar
            </Button>
          )}
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditText(question.text);
                setEditing(true);
              }}
            >
              Editar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Afirmación (texto de la pregunta) */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              placeholder="Editar afirmación..."
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{question.text}</p>
        )}

        {/* Texto original IA */}
        {hasOriginal && (
          <div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? "Ocultar" : "Ver"} afirmación original (IA)
            </button>
            {showOriginal && (
              <p className="mt-2 border-l-2 pl-3 text-sm italic text-muted-foreground">
                {question.originalText}
              </p>
            )}
          </div>
        )}

        {/* Guía de evaluación min/max */}
        {question.scoringGuide && (
          <div className="border-t pt-3">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setShowGuide(!showGuide)}
            >
              {showGuide ? "Ocultar" : "Ver"} guía de calificación (1–5)
            </button>
            {showGuide && (
              <p className="mt-2 rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                {question.scoringGuide}
              </p>
            )}
          </div>
        )}

        {/* Revisiones (doble revisor) */}
        <div className="flex flex-col gap-3 border-t pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Revisiones
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewerPanel
              title="Revisión RRHH"
              review={hrReview}
              editable={reviewerRole === "HR"}
              onSubmit={handleSubmitReview}
            />
            <ReviewerPanel
              title="Revisión Líder de Área"
              review={leadReview}
              editable={reviewerRole === "AREA_LEAD"}
              onSubmit={handleSubmitReview}
            />
          </div>
        </div>

        {/* Calibración */}
        <div className="flex flex-col gap-2 border-t pt-3">
          {question.calibrationStatus === "PENDING" && (
            <p className="text-xs text-muted-foreground">
              Esperando ambas revisiones
            </p>
          )}

          {question.calibrationStatus === "IN_CALIBRATION" && (
            <div className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <span className="text-xs font-medium text-amber-600">
                Discrepancia detectada — requiere calibración
              </span>
              {onResolveCalibration && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-4">
                    <RatingSelector
                      label="Pertinencia"
                      value={calRelevance}
                      onChange={setCalRelevance}
                    />
                    <RatingSelector
                      label="Coherencia"
                      value={calCoherence}
                      onChange={setCalCoherence}
                    />
                    <RatingSelector
                      label="Adecuación"
                      value={calAdequacy}
                      onChange={setCalAdequacy}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="self-start"
                    disabled={!canResolveCalibration}
                    onClick={handleResolveCalibration}
                  >
                    Confirmar consenso
                  </Button>
                </div>
              )}
            </div>
          )}

          {question.calibrationStatus === "RESOLVED" && question.consensus && (
            <div className="flex flex-col gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Consenso
              </span>
              <div className="flex flex-wrap gap-4">
                <RatingRead
                  label="Pertinencia"
                  value={question.consensus.relevanceRating}
                />
                <RatingRead
                  label="Coherencia"
                  value={question.consensus.coherenceRating}
                />
                <RatingRead
                  label="Adecuación"
                  value={question.consensus.adequacyRating}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
