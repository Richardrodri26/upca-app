"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { obtenerContenidoCargo } from "../actions";

type ViewEditCargoDialogProps = {
  cargo: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    nombre_archivo: string,
    contenido_markdown: string,
  ) => Promise<{ success: boolean; error?: string }>;
};

export function ViewEditCargoDialog({
  cargo,
  onOpenChange,
  onSave,
}: ViewEditCargoDialogProps) {
  const open = !!cargo;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!cargo) return;

    setLoading(true);
    setError(null);
    setIsDirty(false);

    obtenerContenidoCargo(cargo).then((result) => {
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNombreArchivo(result.data.nombre_archivo);
      setMarkdownContent(result.data.contenido_markdown);
    });
  }, [cargo]);

  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await onSave(nombreArchivo, markdownContent);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Error al guardar");
      return;
    }

    setIsDirty(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{loading ? "Cargando..." : cargo}</DialogTitle>
          <DialogDescription>
            {loading
              ? "Recuperando contenido del sistema RAG..."
              : `Manual de funciones para el cargo. Archivo: ${nombreArchivo}`}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              Cargando contenido desde el sistema RAG...
            </p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
            <div className="flex flex-col gap-1.5">
              <Label>Contenido Markdown</Label>
              <Textarea
                value={markdownContent}
                onChange={(e) => handleMarkdownChange(e.target.value)}
                className="h-96 resize-none font-mono text-xs"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {isDirty ? "Descartar cambios" : "Cerrar"}
              </Button>
              {isDirty && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
