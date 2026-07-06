"use client";

import { useForm } from "@tanstack/react-form";
import { FieldError } from "@/components/atoms/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CreatePositionInput,
  createPositionSchema,
  type UpdatePositionInput,
} from "@/lib/validators/position";

type PositionData = {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
};

type PositionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: PositionData | null;
  onSubmit: (
    data: CreatePositionInput | UpdatePositionInput,
  ) => Promise<{ success: boolean; error?: string }>;
};

export function PositionForm({
  open,
  onOpenChange,
  position,
  onSubmit,
}: PositionFormProps) {
  const isEditing = !!position;

  const form = useForm({
    defaultValues: {
      name: position?.name ?? "",
      description: position?.description ?? "",
      department: position?.department ?? "",
    } as CreatePositionInput,
    validators: {
      onChange: createPositionSchema,
    },
    onSubmit: async ({ value }) => {
      const result =
        isEditing && position
          ? await onSubmit({ id: position.id, ...value } as UpdatePositionInput)
          : await onSubmit(value as CreatePositionInput);
      if (result.success) {
        onOpenChange(false);
        form.reset();
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cargo" : "Nuevo Cargo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del cargo"
              : "Complete los datos para crear un nuevo cargo"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Nombre del cargo</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Ej: Desarrollador Senior"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="department">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Departamento</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Ej: Tecnologia"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Descripción</Label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  placeholder="Descripción de las responsabilidades del cargo"
                  rows={3}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Guardando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Crear cargo"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
