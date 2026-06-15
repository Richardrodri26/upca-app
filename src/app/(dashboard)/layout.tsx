import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardClientLayout } from "@/components/dashboard/dashboard-client-layout";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as Record<string, unknown>).role as string,
  };

  return <DashboardClientLayout user={user}>{children}</DashboardClientLayout>;
}
