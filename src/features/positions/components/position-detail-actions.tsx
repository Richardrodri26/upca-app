"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/hooks/use-session";
import { Button } from "@/components/ui/button";
import { PositionForm } from "./position-form";
import { useUpdatePosition, useDeletePosition } from "../mutations";

type PositionDetailActionsProps = {
  position: {
    id: string;
    name: string;
    description: string | null;
    department: string | null;
  };
};

export function PositionDetailActions({ position }: PositionDetailActionsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [formOpen, setFormOpen] = useState(false);

  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const canModify = session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  if (!canModify) return null;

  const handleDelete = async () => {
    const result = await deleteMutation.mutateAsync(position.id);
    if (result.success) {
      router.push("/positions");
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          Editar
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Eliminar
        </Button>
      </div>

      <PositionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        position={position}
        onSubmit={async (data) => {
          const result = await updateMutation.mutateAsync(
            data as Parameters<typeof updateMutation.mutateAsync>[0],
          );
          return result;
        }}
      />
    </>
  );
}
