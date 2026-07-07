import { z } from "zod";

export const USER_ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;

export const userRoleSchema = z.enum(USER_ROLES);

export type UserRole = z.infer<typeof userRoleSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2, { error: "Mínimo 2 caracteres" }),
  email: z.email({ error: "Email inválido" }),
  password: z.string().min(8, { error: "Mínimo 8 caracteres" }),
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const setUserRoleSchema = z.object({
  userId: z.string().min(1, { error: "El ID de usuario es requerido" }),
  role: userRoleSchema,
});

export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;
