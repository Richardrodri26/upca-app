import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-black tracking-tighter">
            U
          </div>
          <span className="text-lg font-bold tracking-tight">UPCA</span>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-3xl font-bold leading-snug tracking-tight">
            Sistema Inteligente de Evaluación de Desempeño
          </p>
          <p className="text-sm text-primary-foreground/70">
            Generación automatizada de evaluaciones a partir de manuales de funciones mediante inteligencia artificial.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          UPCA © {new Date().getFullYear()}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo visible only on mobile */}
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
              U
            </div>
            <span className="text-sm font-semibold">UPCA</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
