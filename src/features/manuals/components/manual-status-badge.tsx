import { Badge } from "@/components/ui/badge";
import type { ManualStatus } from "@/generated/prisma/client";

const statusConfig: Record<
  ManualStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  PENDING: { variant: "outline", label: "Pendiente" },
  PROCESSING: { variant: "secondary", label: "Procesando" },
  PROCESSED: { variant: "default", label: "Procesado" },
  ERROR: { variant: "destructive", label: "Error" },
};

type ManualStatusBadgeProps = {
  status: ManualStatus;
};

export function ManualStatusBadge({ status }: ManualStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
