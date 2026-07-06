import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardClientLayout } from "@/components/dashboard/dashboard-client-layout";
import { auth } from "@/lib/auth";

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
