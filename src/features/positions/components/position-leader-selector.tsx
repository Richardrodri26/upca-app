"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/use-session";
import { useSetPositionLeader } from "../mutations";
import { useAreaLeads } from "../queries";

type PositionLeaderSelectorProps = {
  positionId: string;
  currentLeaderId: string | null;
};

const NONE_VALUE = "__none__";

export function PositionLeaderSelector({
  positionId,
  currentLeaderId,
}: PositionLeaderSelectorProps) {
  const { data: session } = useSession();
  const canModify =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const { data: leads = [] } = useAreaLeads();
  const setLeader = useSetPositionLeader();

  const [value, setValue] = useState(currentLeaderId ?? NONE_VALUE);

  const selectedLeader =
    value !== NONE_VALUE ? leads.find((l) => l.id === value) : undefined;

  const hasChange = value !== (currentLeaderId ?? NONE_VALUE);

  const handleApply = () => {
    const leaderId = value === NONE_VALUE ? null : value;
    setLeader.mutate({ positionId, leaderId });
  };

  if (!canModify) {
    const leader = leads.find((l) => l.id === currentLeaderId);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Líder de Área</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {leader ? leader.name : "Sin líder asignado"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Líder de Área</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select
          value={value}
          onValueChange={(v) => {
            if (v) setValue(v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sin líder asignado">
              {(val: string) => {
                if (!val || val === NONE_VALUE) return "Sin líder";
                const lead = leads.find((l) => l.id === val);
                return lead ? lead.name : "Sin líder asignado";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sin líder</SelectItem>
            {leads.map((lead) => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLeader && (
          <p className="text-xs text-muted-foreground">
            {selectedLeader.email}
          </p>
        )}
        <Button
          size="sm"
          className="self-start"
          disabled={!hasChange || setLeader.isPending}
          onClick={handleApply}
        >
          {setLeader.isPending ? "Guardando..." : "Asignar líder"}
        </Button>
      </CardContent>
    </Card>
  );
}
