"use client";

import { useState, useRef } from "react";
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

type UploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: PositionOption[];
  onUpload: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
};

export function UploadDialog({
  open,
  onOpenChange,
  positions,
  onUpload,
}: UploadDialogProps) {
  const [positionId, setPositionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!positionId || !file) {
      setError("Seleccione un cargo y un archivo");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("positionId", positionId);
    formData.append("file", file);

    const result = await onUpload(formData);

    if (result.success) {
      setPositionId("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
    } else {
      setError(result.error ?? "Error al subir el manual");
    }

    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir Manual</DialogTitle>
            <DialogDescription>
              Seleccione el cargo y el archivo PDF del manual de funciones
            </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Cargo</Label>
            <Select value={positionId} onValueChange={(v) => { if (v) setPositionId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un cargo" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-file">Archivo PDF</Label>
            <input
              ref={fileInputRef}
              id="manual-file"
              type="file"
              accept=".pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button onClick={handleSubmit} disabled={uploading || !positionId || !file}>
            {uploading ? "Subiendo..." : "Subir Manual"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
