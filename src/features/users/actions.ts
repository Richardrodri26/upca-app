"use server";

import { hashPassword } from "better-auth/crypto";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import {
  type CreateUserInput,
  createUserSchema,
  setUserRoleSchema,
  type UserRole,
} from "@/lib/validators/user";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

export async function getAllUsers(): Promise<UserRow[]> {
  await requireAuth({ roles: ["ADMIN"] });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return users as UserRow[];
}

export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAuth({ roles: ["ADMIN"] });

  const parsed = setUserRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { ok: false, error: "Rol inválido" };
  }

  const { userId: targetUserId, role: targetRole } = parsed.data;

  // Last-admin guard: demoting an ADMIN is forbidden if they are the only one.
  const currentUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });

  if (!currentUser) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  if (currentUser.role === "ADMIN" && targetRole !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        ok: false,
        error: "No puedes degradar al último administrador",
      };
    }
  }

  // Prevent self-demotion lockout (extra safety on top of last-admin guard).
  if (
    userId === session.user.id &&
    currentUser.role === "ADMIN" &&
    targetRole !== "ADMIN"
  ) {
    return {
      ok: false,
      error:
        "No puedes degradar tu propia cuenta mientras eres el único administrador",
    };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: targetRole },
  });

  return { ok: true };
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAuth({ roles: ["ADMIN"] });

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese email" };
  }

  // hashPassword is Better Auth's official exposed hashing helper
  // (better-auth/crypto) — the same primitive the admin plugin uses
  // internally via ctx.context.password.hash. Verified to produce hashes
  // that signIn.email verifies against (see prisma/seed.ts).
  const hashedPassword = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, emailVerified: true, role },
    });
    await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  });

  return { ok: true };
}
