"use client";

import { useRef, useState } from "react";
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
import { procesarDocumento } from "../actions";

type Step = "upload" | "review" | "saving";

type UploadCargoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    nombre_archivo: string,
    contenido_markdown: string,
  ) => Promise<{ success: boolean; error?: string }>;
};

export function UploadCargoDialog({
  open,
  onOpenChange,
  onSave,
}: UploadCargoDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargoIdentificado, setCargoIdentificado] = useState("");
  const [archivoSugerido, setArchivoSugerido] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setSelectedFile(null);
    setProcessing(false);
    setError(null);
    setCargoIdentificado("");
    setArchivoSugerido("");
    setMarkdownContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  };

  const handleProcesar = async () => {
    if (!selectedFile) {
      setError("Seleccione un archivo PDF o DOCX");
      return;
    }

    setProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);

    const result = await procesarDocumento(formData);

    setProcessing(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setCargoIdentificado(result.data.cargo_identificado);
    setArchivoSugerido(result.data.archivo_sugerido);
    setMarkdownContent(result.data.markdown_propuesto);
    setStep("review");
  };

  const handleGuardar = async () => {
    if (!markdownContent.trim()) {
      setError("El contenido del manual no puede estar vacío");
      return;
    }

    setStep("saving");
    setError(null);

    const result = await onSave(archivoSugerido, markdownContent);

    if (!result.success) {
      setStep("review");
      setError(result.error ?? "Error al guardar el cargo");
      return;
    }

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Subir Manual de Funciones"}
            {step === "review" && `Revisar: ${cargoIdentificado}`}
            {step === "saving" && "Guardando en la base de conocimientos..."}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Sube un archivo PDF o DOCX. El sistema lo procesará y estructurará automáticamente con IA."}
            {step === "review" &&
              "Revisá y editá el contenido generado antes de guardarlo en el sistema RAG."}
            {step === "saving" &&
              "Indexando el manual en ChromaDB. Esto puede tomar unos segundos."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file-input">Archivo (PDF o DOCX)</Label>
              <input
                id="file-input"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado:{" "}
                  <span className="font-medium">{selectedFile.name}</span> (
                  {(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleProcesar}
                disabled={processing || !selectedFile}
              >
                {processing ? "Procesando con IA..." : "Procesar documento"}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                Cargo identificado:{" "}
                <span className="font-semibold text-foreground">
                  {cargoIdentificado}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Archivo sugerido:{" "}
                <span className="font-mono text-xs text-foreground">
                  {archivoSugerido}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Contenido Markdown generado</Label>
              <Textarea
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                className="h-72 resize-none font-mono text-xs"
                placeholder="Contenido del manual en Markdown..."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Volver
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={!markdownContent.trim()}
              >
                Guardar e indexar en RAG
              </Button>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground text-sm">
              Guardando{" "}
              <span className="font-medium text-foreground">
                {archivoSugerido}
              </span>{" "}
              en ChromaDB...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
