import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPosition } from "@/features/positions/actions";
import { PositionDetailActions } from "@/features/positions/components/position-detail-actions";
import { PositionLeaderSelector } from "@/features/positions/components/position-leader-selector";
import type { EvaluationStatus, ManualStatus } from "@/generated/prisma/client";

type Params = Promise<{ id: string }>;

const manualStatusLabel = (status: ManualStatus) => {
  const map: Record<ManualStatus, string> = {
    PENDING: "Pendiente",
    PROCESSING: "Procesando",
    PROCESSED: "Procesado",
    ERROR: "Error",
  };
  return map[status];
};

const evaluationStatusBadge = (status: EvaluationStatus) => {
  const map: Record<
    EvaluationStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    DRAFT: { variant: "outline", label: "Borrador" },
    GENERATING: { variant: "secondary", label: "Generando" },
    REVIEW: { variant: "secondary", label: "En revisión" },
    ACTIVE: { variant: "default", label: "Activa" },
    CLOSED: { variant: "outline", label: "Cerrada" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
};

export default async function PositionDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const position = await getPosition(id);

  if (!position) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargo no encontrado
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{position.name}</h1>
          {position.department && (
            <p className="text-muted-foreground">{position.department}</p>
          )}
        </div>
        <PositionDetailActions position={position} />
      </div>

      {position.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{position.description}</p>
          </CardContent>
        </Card>
      )}

      <PositionLeaderSelector
        positionId={position.id}
        currentLeaderId={position.leaderId}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual de Funciones</CardTitle>
        </CardHeader>
        <CardContent>
          {position.manual ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">{position.manual.fileName}</span>
              <Badge
                variant={
                  position.manual.status === "PROCESSED"
                    ? "default"
                    : position.manual.status === "ERROR"
                      ? "destructive"
                      : "secondary"
                }
              >
                {manualStatusLabel(position.manual.status)}
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sin manual asociado</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Evaluaciones ({position.evaluations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {position.evaluations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin evaluaciones</p>
          ) : (
            <div className="flex flex-col gap-2">
              {position.evaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{evaluation.title}</span>
                  {evaluationStatusBadge(evaluation.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
