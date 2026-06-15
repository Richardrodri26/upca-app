import { Badge } from "@/components/ui/badge";
import type { EvaluationStatus, QuestionStatus } from "@/generated/prisma/client";

const evaluationStatusConfig: Record<
  EvaluationStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  DRAFT: { variant: "outline", label: "Borrador" },
  GENERATING: { variant: "secondary", label: "Generando" },
  REVIEW: { variant: "secondary", label: "En revisión" },
  ACTIVE: { variant: "default", label: "Activa" },
  CLOSED: { variant: "outline", label: "Cerrada" },
};

const questionStatusConfig: Record<
  QuestionStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  PENDING: { variant: "outline", label: "Pendiente" },
  APPROVED: { variant: "default", label: "Aprobada" },
  EDITED: { variant: "secondary", label: "Editada" },
  REJECTED: { variant: "destructive", label: "Rechazada" },
};

type EvaluationStatusBadgeProps = {
  status: EvaluationStatus;
};

export function EvaluationStatusBadge({ status }: EvaluationStatusBadgeProps) {
  const config = evaluationStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

type QuestionStatusBadgeProps = {
  status: QuestionStatus;
};

export function QuestionStatusBadge({ status }: QuestionStatusBadgeProps) {
  const config = questionStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
