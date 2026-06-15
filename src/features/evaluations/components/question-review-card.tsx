"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { QuestionStatusBadge } from "./evaluation-status-badge";
import type { QuestionStatus } from "@/generated/prisma/client";

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type QuestionData = {
  id: string;
  text: string;
  order: number;
  status: QuestionStatus;
  originalText: string | null;
  relevanceRating: number | null;
  coherenceRating: number | null;
  adequacyRating: number | null;
};

// ────────────────────────────────────────
// Rating Star Selector
// ────────────────────────────────────────

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
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`h-7 w-7 rounded-md text-sm font-medium transition-colors ${
              value && value >= star
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted-foreground/20"
            }`}
          >
            {star}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

type QuestionReviewCardProps = {
  question: QuestionData;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onRate: (
    id: string,
    ratings: {
      relevanceRating: number;
      coherenceRating: number;
      adequacyRating: number;
    },
  ) => void;
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
  const hasOriginal =
    question.originalText && question.status === "EDITED";

  const handleSaveEdit = () => {
    if (editText.trim().length >= 10 && editText !== question.text) {
      onUpdateText(question.id, editText.trim());
    }
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-muted-foreground tabular-nums">
            {question.order}.
          </span>
          <QuestionStatusBadge status={question.status} />
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
        {/* Text display / edit */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              placeholder="Editar texto de la pregunta..."
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

        {/* Original AI text (toggle) */}
        {hasOriginal && (
          <div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? "Ocultar" : "Ver"} texto original (IA)
            </button>
            {showOriginal && (
              <p className="text-sm text-muted-foreground italic border-l-2 pl-3 mt-2">
                {question.originalText}
              </p>
            )}
          </div>
        )}

        {/* IAP Ratings */}
        <div className="flex flex-wrap gap-6 pt-2 border-t">
          <RatingSelector
            label="Pertinencia"
            value={question.relevanceRating}
            onChange={(v) => {
              onRate(question.id, {
                relevanceRating: v,
                coherenceRating: question.coherenceRating ?? 0,
                adequacyRating: question.adequacyRating ?? 0,
              });
            }}
          />
          <RatingSelector
            label="Coherencia"
            value={question.coherenceRating}
            onChange={(v) => {
              onRate(question.id, {
                relevanceRating: question.relevanceRating ?? 0,
                coherenceRating: v,
                adequacyRating: question.adequacyRating ?? 0,
              });
            }}
          />
          <RatingSelector
            label="Adecuación"
            value={question.adequacyRating}
            onChange={(v) => {
              onRate(question.id, {
                relevanceRating: question.relevanceRating ?? 0,
                coherenceRating: question.coherenceRating ?? 0,
                adequacyRating: v,
              });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
