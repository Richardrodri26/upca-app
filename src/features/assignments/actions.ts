"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

// ────────────────────────────────────────
// Assign evaluation to employees
// ────────────────────────────────────────

export async function assignEvaluation(
  evaluationId: string,
  employeeIds: string[],
) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  // Verify evaluation exists and is ACTIVE
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

  for (const employeeId of employeeIds) {
    try {
      await prisma.evaluationAssignment.create({
        data: {
          evaluationId,
          employeeId,
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
  const assignments = await prisma.evaluationAssignment.findMany({
    where: { evaluationId },
    include: {
      employee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return assignments;
}

// ────────────────────────────────────────
// Get current employee's assignments
// ────────────────────────────────────────

export async function getMyAssignments() {
  const session = await requireAuth();

  const assignments = await prisma.evaluationAssignment.findMany({
    where: { employeeId: session.user.id },
    include: {
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
  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      employee: { select: { id: true, name: true } },
      evaluation: {
        include: {
          position: { select: { name: true } },
          questions: {
            orderBy: { order: "asc" },
          },
        },
      },
      responses: true,
    },
  });

  return assignment;
}

// ────────────────────────────────────────
// Get all employees (for assignment selector)
// ────────────────────────────────────────

export async function getEmployees() {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return employees;
}

// ────────────────────────────────────────
// Submit a single response (auto-save)
// ────────────────────────────────────────

export async function submitResponse(
  assignmentId: string,
  questionId: string,
  value: number,
) {
  const session = await requireAuth();

  // Verify the assignment belongs to the current user
  const assignment = await prisma.evaluationAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      employeeId: true,
      status: true,
      evaluationId: true,
    },
  });

  if (!assignment) {
    return { success: false, error: "Asignación no encontrada" };
  }
  if (assignment.employeeId !== session.user.id) {
    return { success: false, error: "No autorizado" };
  }
  if (assignment.status === "COMPLETED") {
    return {
      success: false,
      error: "No se puede modificar una evaluación completada",
    };
  }

  // Verify the question belongs to the same evaluation
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { evaluationId: true },
  });

  if (!question || question.evaluationId !== assignment.evaluationId) {
    return { success: false, error: "La pregunta no pertenece a esta evaluación" };
  }

  // Upsert the response
  await prisma.response.upsert({
    where: {
      questionId_assignmentId: { questionId, assignmentId },
    },
    create: { questionId, assignmentId, value },
    update: { value },
  });

  // If status is PENDING, update to IN_PROGRESS
  if (assignment.status === "PENDING") {
    await prisma.evaluationAssignment.update({
      where: { id: assignmentId },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath("/my-evaluations");
  return { success: true };
}

// ────────────────────────────────────────
// Complete an assignment
// ────────────────────────────────────────

export async function completeAssignment(assignmentId: string) {
  const session = await requireAuth();

  // Verify the assignment belongs to the current user
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
  if (assignment.employeeId !== session.user.id) {
    return { success: false, error: "No autorizado" };
  }
  if (assignment.status === "COMPLETED") {
    return { success: false, error: "La evaluación ya fue completada" };
  }

  // Check all questions are answered
  const totalQuestions = assignment.evaluation._count.questions;
  const totalResponses = assignment.responses.length;

  if (totalResponses < totalQuestions) {
    return {
      success: false,
      error: `Faltan ${totalQuestions - totalResponses} preguntas por responder`,
    };
  }

  // Calculate average score
  const score =
    assignment.responses.reduce((sum, r) => sum + r.value, 0) /
    totalResponses;

  await prisma.evaluationAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "COMPLETED",
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      completedAt: new Date(),
    },
  });

  revalidatePath("/my-evaluations");
  return { success: true, score };
}
