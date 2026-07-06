"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PositionOption = {
  id: string;
  name: string;
};

type RegisterManualDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: PositionOption[];
  onRegister: (positionId: string) => Promise<{ success: boolean; error?: string }>;
};

export function UploadDialog({
  open,
  onOpenChange,
  positions,
  onRegister,
}: RegisterManualDialogProps) {
  const [positionId, setPositionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!positionId) {
      setError("Seleccione un cargo");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onRegister(positionId);

    if (result.success) {
      setPositionId("");
      onOpenChange(false);
    } else {
      setError(result.error ?? "Error al registrar el cargo");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Manual en RAG</DialogTitle>
          <DialogDescription>
            Verifica que el cargo esté indexado en el sistema RAG del agente
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Cargo</Label>
            <Select value={positionId} onValueChange={(v) => { if (v) setPositionId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un cargo">
                  {positions.find((p) => p.id === positionId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {positions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Todos los cargos ya tienen manual registrado.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || !positionId}
          >
            {loading ? "Verificando en RAG..." : "Registrar en RAG"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
