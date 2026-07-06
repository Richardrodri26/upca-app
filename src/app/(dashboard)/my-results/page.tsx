"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/features/auth/hooks/use-session";
import { useMyResults } from "@/features/results/queries";

export default function MyResultsPage() {
  const { data: session } = useSession();
  const { data: assignments = [], isLoading } = useMyResults();

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">Cargando...</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Mis Resultados</h1>

      {assignments.length === 0 ? (
        <div className="text-muted-foreground py-16 text-center">
          <p>Todavía no tenés resultados de evaluaciones completadas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">
                    {assignment.evaluation.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {assignment.evaluation.position.name}
                  </p>
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {assignment.score != null ? assignment.score.toFixed(1) : "—"}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {assignment.completedAt
                    ? new Date(assignment.completedAt).toLocaleDateString()
                    : "—"}
                </div>
                {session?.user?.id && (
                  <Link
                    href={`/evaluations/${assignment.evaluation.id}/results/${session.user.id}`}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                  >
                    Ver detalle
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
