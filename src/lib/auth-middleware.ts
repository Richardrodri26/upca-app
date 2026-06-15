import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type Role = "ADMIN" | "HR" | "EMPLOYEE";

/**
 * Require a valid session and optionally check for specific roles.
 * Redirects to /sign-in if no session is found.
 * Redirects to /unauthorized if the user's role is not in the allowed list.
 */
export async function requireAuth(options?: { roles?: Role[] }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  if (
    options?.roles &&
    options.roles.length > 0 &&
    !options.roles.includes(session.user.role as Role)
  ) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Get the current session without redirecting. Returns null if no session.
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}
