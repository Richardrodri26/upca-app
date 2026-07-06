"use server";

import { getSession, requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { calculateIAP, calculateIRTO } from "./utils/iap";

// ────────────────────────────────────────
// Dashboard stats (HR/ADMIN)
// ────────────────────────────────────────

export async function getDashboardStats() {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const [activeEvals, processedManuals, evaluatedEmployees, allRatedQuestions] =
    await Promise.all([
      prisma.evaluation.count({ where: { status: "ACTIVE" } }),
      prisma.manual.count({ where: { status: "PROCESSED" } }),
      prisma.evaluationAssignment
        .findMany({
          where: { status: "COMPLETED" },
          select: { employeeId: true },
          distinct: ["employeeId"],
        })
        .then((r) => r.length),
      prisma.question.findMany({
        where: {
          relevanceRating: { not: null },
          coherenceRating: { not: null },
          adequacyRating: { not: null },
        },
        select: {
          relevanceRating: true,
          coherenceRating: true,
          adequacyRating: true,
        },
      }),
    ]);

  const iapResult = calculateIAP(allRatedQuestions);

  return {
    activeEvaluations: activeEvals,
    processedManuals,
    evaluatedEmployees,
    averageIAP: iapResult.iap,
    ratedQuestions: iapResult.ratedCount,
  };
}

// ────────────────────────────────────────
// Dashboard stats (EMPLOYEE)
// ────────────────────────────────────────

export async function getDashboardStatsForEmployee() {
  const session = await requireAuth();

  const [totalAssignments, completedAssignments, pendingAssignments] =
    await Promise.all([
      prisma.evaluationAssignment.count({
        where: { employeeId: session.user.id },
      }),
      prisma.evaluationAssignment.findMany({
        where: {
          employeeId: session.user.id,
          status: "COMPLETED",
        },
        select: { score: true },
      }),
      prisma.evaluationAssignment.count({
        where: {
          employeeId: session.user.id,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
    ]);

  const avgScore =
    completedAssignments.length > 0
      ? completedAssignments.reduce((s, a) => s + (a.score ?? 0), 0) /
        completedAssignments.length
      : 0;

  return {
    totalAssignments,
    completedCount: completedAssignments.length,
    pendingCount: pendingAssignments,
    averageScore: Math.round(avgScore * 10) / 10,
  };
}

// ────────────────────────────────────────
// Evaluation results (HR/ADMIN)
// ────────────────────────────────────────

export async function getEvaluationResults(evaluationId: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const [evaluation, assignments, questions] = await Promise.all([
    prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { position: { select: { name: true } } },
    }),
    prisma.evaluationAssignment.findMany({
      where: { evaluationId },
      include: {
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.question.findMany({
      where: { evaluationId },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!evaluation) {
    return null;
  }

  const completedAssignments = assignments.filter(
    (a) => a.status === "COMPLETED",
  );
  const overallAvg =
    completedAssignments.length > 0
      ? completedAssignments.reduce((s, a) => s + (a.score ?? 0), 0) /
        completedAssignments.length
      : 0;

  const iapResult = calculateIAP(questions);
  const irtoResult = calculateIRTO(evaluation.generationTime ?? 0);

  return {
    evaluation: {
      id: evaluation.id,
      title: evaluation.title,
      status: evaluation.status,
      positionName: evaluation.position.name,
      generationTime: evaluation.generationTime,
    },
    assignments,
    questions,
    overallAverageScore: Math.round(overallAvg * 10) / 10,
    completedCount: completedAssignments.length,
    totalAssignments: assignments.length,
    iap: iapResult.iap,
    iapRatedCount: iapResult.ratedCount,
    irto: irtoResult.irto,
    irtoGenerationMinutes: irtoResult.generationMinutes,
    irtoManualMinutes: irtoResult.manualBaselineMinutes,
  };
}

// ────────────────────────────────────────
// Employee results detail
// ────────────────────────────────────────

export async function getEmployeeResults(
  evaluationId: string,
  employeeId: string,
) {
  const session = await getSession();

  // Must be logged in
  if (!session) {
    return { error: "No autorizado" };
  }

  // EMPLOYEE can only view their own results
  if (session.user.role === "EMPLOYEE" && session.user.id !== employeeId) {
    return { error: "No autorizado" };
  }

  const [assignment, questions, allResponses] = await Promise.all([
    prisma.evaluationAssignment.findFirst({
      where: { evaluationId, employeeId },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        evaluation: {
          include: { position: { select: { name: true } } },
        },
      },
    }),
    prisma.question.findMany({
      where: { evaluationId },
      orderBy: { order: "asc" },
    }),
    prisma.response.findMany({
      where: { assignment: { evaluationId } },
      select: { questionId: true, value: true },
    }),
  ]);

  if (!assignment) {
    return null;
  }

  // Map per-question averages across all employees
  const questionAverages = new Map<string, number>();
  for (const q of questions) {
    const responses = allResponses.filter((r) => r.questionId === q.id);
    if (responses.length > 0) {
      const avg = responses.reduce((s, r) => s + r.value, 0) / responses.length;
      questionAverages.set(q.id, Math.round(avg * 10) / 10);
    }
  }

  const employeeResponses = await prisma.response.findMany({
    where: { assignmentId: assignment.id },
    select: { questionId: true, value: true },
  });

  const responseMap = new Map(
    employeeResponses.map((r) => [r.questionId, r.value]),
  );

  return {
    assignment: {
      id: assignment.id,
      status: assignment.status,
      score: assignment.score,
      completedAt: assignment.completedAt,
      employee: assignment.employee,
      evaluation: {
        title: assignment.evaluation.title,
        positionName: assignment.evaluation.position.name,
      },
    },
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      employeeResponse: responseMap.get(q.id) ?? null,
      overallAverage: questionAverages.get(q.id) ?? null,
    })),
  };
}
