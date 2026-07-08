"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionStatus } from "@/generated/prisma/client";
import type { RateQuestionInput } from "@/lib/validators/evaluation";
import { QuestionStatusBadge } from "./evaluation-status-badge";

type QuestionData = {
  id: string;
  text: string;
  order: number;
  status: QuestionStatus;
  originalText: string | null;
  pillar: string | null;
  manualReference: string | null;
  scoringGuide: string | null;
  relevanceRating: number | null;
  coherenceRating: number | null;
  adequacyRating: number | null;
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
              className={`h-7 w-7 rounded-md text-sm font-medium transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted-foreground/20"
              }`}
            >
              {star}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type QuestionReviewCardProps = {
  question: QuestionData;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onRate: (id: string, ratings: RateQuestionInput) => void;
};

export function QuestionReviewCard({
  question,
  onApprove,
  onReject,
  onUpdateText,
  onRate,
}: QuestionReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const hasOriginal = question.originalText && question.status === "EDITED";

  const handleSaveEdit = () => {
    if (editText.trim().length >= 10 && editText !== question.text) {
      onUpdateText(question.id, editText.trim());
    }
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground tabular-nums">
              {question.order}.
            </span>
            <QuestionStatusBadge status={question.status} />
            {question.pillar && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {question.pillar}
              </span>
            )}
          </div>
          {question.manualReference && (
            <span className="text-xs text-muted-foreground pl-6">
              Ref: {question.manualReference}
            </span>
          )}
        </div>
        <div className="flex gap-1">
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

        {/* IAP Ratings */}
        <div className="flex flex-wrap gap-6 border-t pt-3">
          <RatingSelector
            label="Pertinencia"
            value={question.relevanceRating}
            onChange={(v) => onRate(question.id, { relevanceRating: v })}
          />
          <RatingSelector
            label="Coherencia"
            value={question.coherenceRating}
            onChange={(v) => onRate(question.id, { coherenceRating: v })}
          />
          <RatingSelector
            label="Adecuación"
            value={question.adequacyRating}
            onChange={(v) => onRate(question.id, { adequacyRating: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
