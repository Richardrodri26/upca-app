"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { useGenerateEvaluation } from "@/features/evaluations/queries";
import { getPositionsWithProcessedManual } from "@/features/evaluations/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export default function GenerateEvaluationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [positionId, setPositionId] = useState("");
  const [questionCount, setQuestionCount] = useState(15);
  const [error, setError] = useState<string | null>(null);

  const { data: positions = [] } = useQuery({
    queryKey: ["evaluations", "positions-with-processed-manual"],
    queryFn: () => getPositionsWithProcessedManual(),
  });

  const mutation = useGenerateEvaluation();

  // Role guard
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para generar evaluaciones
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!positionId) {
      setError("Seleccione un cargo");
      return;
    }
    setError(null);

    const result = await mutation.mutateAsync({ positionId, questionCount });

    if (result.success && result.evaluationId) {
      router.push(`/evaluations/${result.evaluationId}/review`);
    } else {
      setError(result.error ?? "Error al generar la evaluación");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Generar Evaluación
        </h1>
        <p className="text-muted-foreground">
          Seleccione un cargo con manual procesado para generar preguntas con IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Elegí el cargo y la cantidad de preguntas a generar
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label>Cargo</Label>
            <Select value={positionId} onValueChange={(v) => { if (v) setPositionId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un cargo" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.department ?? "Sin depto"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {positions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay cargos con manual procesado. Subí un manual primero.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Cantidad de preguntas</Label>
              <span className="text-sm font-medium tabular-nums w-8 text-right">
                {questionCount}
              </span>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={(values) => {
                const v = Array.isArray(values) ? values[0] : values;
                if (v !== undefined && v !== null) setQuestionCount(v);
              }}
              min={10}
              max={20}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Entre 10 y 20 preguntas
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleGenerate}
            disabled={mutation.isPending || positions.length === 0}
            className="w-full"
          >
            {mutation.isPending ? "Generando con IA..." : "Generar con IA"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
