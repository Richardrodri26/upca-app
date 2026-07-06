"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import {
  assignEvaluationSchema,
  submitResponseSchema,
} from "@/lib/validators/assignment";

// ────────────────────────────────────────
// Assign evaluation: HR selects employee + evaluator per pair
// ────────────────────────────────────────

export async function assignEvaluation(
  evaluationId: string,
  pairs: { employeeId: string; evaluatorId: string }[],
) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const parsed = assignEvaluationSchema.safeParse({ evaluationId, pairs });
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Datos de asignación inválidos",
    };
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, status: true },
  });

  if (!evaluation) {
    return { success: false, error: "Evaluación no encontrada" };
  }
  if (evaluation.status !== "ACTIVE") {
    return {
      success: false,
      error: "Solo se pueden asignar evaluaciones activas",
    };
  }

  let created = 0;
  let skipped = 0;

  for (const { employeeId, evaluatorId } of pairs) {
    try {
      await prisma.evaluationAssignment.create({
        data: {
          evaluationId,
          employeeId,
          evaluatorId,
          status: "PENDING",
        },
      });
      created++;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        skipped++;
      } else {
        throw error;
      }
    }
  }

  revalidatePath("/evaluations");
  return { success: true, created, skipped };
}

// ────────────────────────────────────────
// Get assignments for an evaluation (HR view)
// ────────────────────────────────────────

export async function getEvaluationAssignments(evaluationId: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const assignments = await prisma.evaluationAssignment.findMany({
    where: { evaluationId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      evaluator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return assignments;
}

// ────────────────────────────────────────
// Get evaluations pending for the current user as evaluator
// ────────────────────────────────────────

export async function getMyAssignments() {
  const session = await requireAuth();

  const assignments = await prisma.evaluationAssignment.findMany({
    where: { evaluatorId: session.user.id },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      evaluation: {
        include: {
          position: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return assignments;
}

// ────────────────────────────────────────
// Get single assignment with full detail (for response form)
// ────────────────────────────────────────

export async function getAssignment(assignmentId: string) {
  const session = await requireAuth();

  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      evaluator: { select: { id: true, name: true } },
      evaluation: {
        include: {
          position: { select: { name: true } },
          questions: { orderBy: { order: "asc" } },
        },
      },
      responses: true,
    },
  });

  if (!assignment) return null;

  const isOwner = assignment.evaluatorId === session.user.id;
  const isManager = session.user.role === "ADMIN" || session.user.role === "HR";
  if (!isOwner && !isManager) return null;

  return assignment;
}

// ────────────────────────────────────────
// Get all users for assignment selector (employees to evaluate)
// ────────────────────────────────────────

export async function getUsers() {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return users;
}

// ────────────────────────────────────────
// Submit a single response (auto-save) — performed by the evaluator
// ────────────────────────────────────────

export async function submitResponse(
  assignmentId: string,
  questionId: string,
  value: number,
) {
  const session = await requireAuth();

  const parsed = submitResponseSchema.safeParse({ assignmentId, questionId, value });
  if (!parsed.success) {
    return {
      success: false,
      error: "Valor inválido: debe ser un entero entre 1 y 5",
    };
  }

  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    select: {
      id: true,
      evaluatorId: true,
      status: true,
      evaluationId: true,
      evaluation: { select: { status: true } },
    },
  });

  if (!assignment) {
    return { success: false, error: "Asignación no encontrada" };
  }
  if (assignment.evaluatorId !== session.user.id) {
    return { success: false, error: "No autorizado" };
  }
  if (assignment.status === "COMPLETED") {
    return {
      success: false,
      error: "No se puede modificar una evaluación completada",
    };
  }
  if (assignment.evaluation.status !== "ACTIVE") {
    return { success: false, error: "La evaluación ya no está activa" };
  }

  const question = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    select: { evaluationId: true },
  });

  if (!question || question.evaluationId !== assignment.evaluationId) {
    return { success: false, error: "La pregunta no pertenece a esta evaluación" };
  }

  await prisma.response.upsert({
    where: {
      questionId_assignmentId: {
        questionId: parsed.data.questionId,
        assignmentId: parsed.data.assignmentId,
      },
    },
    create: {
      questionId: parsed.data.questionId,
      assignmentId: parsed.data.assignmentId,
      value: parsed.data.value,
    },
    update: { value: parsed.data.value },
  });

  if (assignment.status === "PENDING") {
    await prisma.evaluationAssignment.update({
      where: { id: parsed.data.assignmentId },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath("/my-evaluations");
  return { success: true };
}

// ────────────────────────────────────────
// Complete an assignment — performed by the evaluator
// ────────────────────────────────────────

export async function completeAssignment(assignmentId: string) {
  const session = await requireAuth();

  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      evaluation: {
        include: {
          _count: { select: { questions: true } },
        },
      },
      responses: { select: { value: true } },
    },
  });

  if (!assignment) {
    return { success: false, error: "Asignación no encontrada" };
  }
  if (assignment.evaluatorId !== session.user.id) {
    return { success: false, error: "No autorizado" };
  }
  if (assignment.status === "COMPLETED") {
    return { success: false, error: "La evaluación ya fue completada" };
  }
  if (assignment.evaluation.status !== "ACTIVE") {
    return { success: false, error: "La evaluación ya no está activa" };
  }

  const totalQuestions = assignment.evaluation._count.questions;
  const totalResponses = assignment.responses.length;

  if (totalQuestions === 0) {
    return { success: false, error: "La evaluación no tiene preguntas" };
  }
  if (totalResponses < totalQuestions) {
    return {
      success: false,
      error: `Faltan ${totalQuestions - totalResponses} preguntas por responder`,
    };
  }

  const score =
    assignment.responses.reduce((sum, r) => sum + r.value, 0) / totalResponses;

  const updated = await prisma.evaluationAssignment.updateMany({
    where: { id: assignmentId, status: { not: "COMPLETED" } },
    data: {
      status: "COMPLETED",
      score: Math.round(score * 10) / 10,
      completedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return { success: false, error: "La evaluación ya fue completada" };
  }

  revalidatePath("/my-evaluations");
  return { success: true, score };
}
