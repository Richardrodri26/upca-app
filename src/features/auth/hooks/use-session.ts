"use client";

import { useSession as useBetterAuthSession } from "@/lib/auth-client";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: string;
};

/**
 * Typed version of useSession that includes the custom `role` field.
 */
export function useSession() {
  const session = useBetterAuthSession();
  return {
    ...session,
    data: session.data
      ? {
          ...session.data,
          user: session.data.user as unknown as SessionUser,
        }
      : null,
  };
}
