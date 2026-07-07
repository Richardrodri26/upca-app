import { z } from "zod";

export const USER_ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;

export const userRoleSchema = z.enum(USER_ROLES);

export type UserRole = z.infer<typeof userRoleSchema>;

export const setUserRoleSchema = z.object({
  userId: z.string().min(1, { error: "El ID de usuario es requerido" }),
  role: userRoleSchema,
});

export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;
