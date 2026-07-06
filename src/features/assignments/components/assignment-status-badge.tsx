import { Badge } from "@/components/ui/badge";
import type { AssignmentStatus } from "@/generated/prisma/client";

const config: Record<
  AssignmentStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  PENDING: { variant: "outline", label: "Pendiente" },
  IN_PROGRESS: { variant: "secondary", label: "En Progreso" },
  COMPLETED: { variant: "default", label: "Completada" },
};

type AssignmentStatusBadgeProps = {
  status: AssignmentStatus;
};

export function AssignmentStatusBadge({ status }: AssignmentStatusBadgeProps) {
  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
