"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import {
  type CreatePositionInput,
  createPositionSchema,
  type UpdatePositionInput,
  updatePositionSchema,
} from "@/lib/validators/position";

export async function getPositions(search?: string, department?: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const where: Record<string, unknown> = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }
  if (department) {
    where.department = department;
  }

  const positions = await prisma.position.findMany({
    where,
    include: {
      manual: {
        select: { id: true, status: true },
      },
      evaluations: {
        select: { id: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return positions;
}

export async function getPosition(id: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const position = await prisma.position.findUnique({
    where: { id },
    include: {
      manual: {
        select: {
          id: true,
          fileName: true,
          status: true,
          externalRef: true,
        },
      },
      evaluations: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return position;
}

export async function getDepartments() {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const positions = await prisma.position.findMany({
    select: { department: true },
    distinct: ["department"],
    where: { department: { not: null } },
    orderBy: { department: "asc" },
  });

  return positions
    .map((p) => p.department)
    .filter((d): d is string => d !== null);
}

export async function createPosition(data: CreatePositionInput) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const parsed = createPositionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await prisma.position.create({ data: parsed.data });
    revalidatePath("/positions");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo crear el cargo" };
  }
}

export async function updatePosition(data: UpdatePositionInput) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const parsed = updatePositionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, ...rest } = parsed.data;

  try {
    await prisma.position.update({
      where: { id },
      data: rest,
    });
    revalidatePath("/positions");
    revalidatePath(`/positions/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar el cargo" };
  }
}

export async function deletePosition(id: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  try {
    await prisma.position.delete({ where: { id } });
    revalidatePath("/positions");
    return { success: true };
  } catch {
    return {
      success: false,
      error:
        "No se pudo eliminar el cargo. Puede tener manuales o evaluaciones asociadas.",
    };
  }
}

export async function getAreaLeads() {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const users = await prisma.user.findMany({
    where: { role: "AREA_LEAD" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return users;
}

export async function setPositionLeader(
  positionId: string,
  leaderId: string | null,
) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  try {
    await prisma.position.update({
      where: { id: positionId },
      data: { leaderId },
    });
    revalidatePath("/positions");
    revalidatePath(`/positions/${positionId}`);
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo asignar el líder del cargo" };
  }
}
