"use client";

import { LockIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/auth-client";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <LockIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">No tiene permisos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <p className="text-center text-sm text-muted-foreground">
            No tiene los permisos necesarios para acceder a esta sección.
          </p>
          <div className="flex gap-3">
            <Link href="/" className={buttonVariants()}>
              Volver al inicio
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                router.push("/sign-in");
                router.refresh();
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
