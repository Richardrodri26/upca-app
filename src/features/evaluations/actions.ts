"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { generateEvaluation as ragGenerate } from "@/lib/rag-client";
import {
  type ConsensusInput,
  consensusSchema,
  type ReviewQuestionInput,
  reviewQuestionSchema,
} from "./validators";

const DEFAULT_ENFOQUE = "Desempeño general de funciones y responsabilidades";

import type {
  EvaluationStatus,
  QuestionStatus,
} from "@/generated/prisma/client";

// ────────────────────────────────────────
// Queries
// ────────────────────────────────────────

export async function getEvaluations(status?: EvaluationStatus) {
  const session = await requireAuth({ roles: ["ADMIN", "HR", "AREA_LEAD"] });
  const baseWhere = status ? { status } : {};
  const where =
    session.user.role === "AREA_LEAD"
      ? { ...baseWhere, position: { leaderId: session.user.id } }
      : baseWhere;

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      position: { select: { id: true, name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return evaluations;
}

export async function getEvaluation(id: string) {
  const session = await requireAuth({ roles: ["ADMIN", "HR", "AREA_LEAD"] });
  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      position: { select: { id: true, name: true, leaderId: true } },
      manual: { select: { id: true, fileName: true } },
      createdBy: { select: { id: true, name: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          reviews: {
            select: {
              reviewerRole: true,
              reviewerId: true,
              relevanceRating: true,
              coherenceRating: true,
              adequacyRating: true,
            },
          },
          consensus: true,
        },
      },
    },
  });

  if (
    evaluation &&
    session.user.role === "AREA_LEAD" &&
    evaluation.position.leaderId !== session.user.id
  ) {
    return null;
  }

  return evaluation;
}

export async function getPositionsWithProcessedManual() {
  const session = await requireAuth({ roles: ["ADMIN", "HR", "AREA_LEAD"] });
  const baseWhere = { manual: { status: "PROCESSED" as const } };
  const where =
    session.user.role === "AREA_LEAD"
      ? { ...baseWhere, leaderId: session.user.id }
      : baseWhere;

  const positions = await prisma.position.findMany({
    where,
    include: {
      manual: { select: { id: true, externalRef: true } },
    },
    orderBy: { name: "asc" },
  });

  return positions;
}

// ────────────────────────────────────────
// Mutations
// ────────────────────────────────────────

export async function generateEvaluation(positionId: string, enfoque?: string) {
  const session = await requireAuth({ roles: ["ADMIN", "HR"] });

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: {
      manual: {
        select: { id: true, status: true },
      },
    },
  });

  if (!position) {
    return { success: false, error: "Cargo no encontrado" };
  }

  if (!position.manual || position.manual.status !== "PROCESSED") {
    return {
      success: false,
      error: "El cargo no tiene un manual registrado en el sistema RAG",
    };
  }

  // Call RAG service with cargo name + enfoque
  const result = await ragGenerate(
    position.name,
    enfoque?.trim() || DEFAULT_ENFOQUE,
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const manualId = position.manual.id;

  // Create evaluation + questions in a transaction
  const evaluation = await prisma.$transaction(async (tx) => {
    const eval_ = await tx.evaluation.create({
      data: {
        title: `Evaluación - ${position.name}`,
        status: "REVIEW",
        generationTime: result.data.generationTimeMs / 1000,
        positionId: position.id,
        manualId,
        createdById: session.user.id,
      },
    });

    await tx.question.createMany({
      data: result.data.questions.map((q, i) => ({
        text: q.text,
        order: i + 1,
        status: "PENDING" as QuestionStatus,
        pillar: q.pillar,
        manualReference: q.manualReference,
        scoringGuide: q.scoringGuide,
        evaluationId: eval_.id,
      })),
    });

    return eval_;
  });

  revalidatePath("/evaluations");
  return { success: true, evaluationId: evaluation.id };
}

export async function updateQuestionText(id: string, text: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const question = await prisma.question.findUnique({
    where: { id },
    select: { id: true, text: true, status: true, originalText: true },
  });

  if (!question) {
    return { success: false, error: "Pregunta no encontrada" };
  }

  await prisma.question.update({
    where: { id },
    data: {
      originalText: question.originalText ?? question.text,
      text,
      status: "EDITED" as QuestionStatus,
    },
  });

  revalidatePath("/evaluations");
  return { success: true };
}

export async function updateQuestionStatus(
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  await prisma.question.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/evaluations");
  return { success: true };
}

export async function submitReview(
  questionId: string,
  input: ReviewQuestionInput,
) {
  const session = await requireAuth({ roles: ["ADMIN", "HR", "AREA_LEAD"] });
  const parsed = reviewQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Calificación inválida (1-5)" };
  }

  const reviewerRole = session.user.role === "AREA_LEAD" ? "AREA_LEAD" : "HR";

  if (reviewerRole === "AREA_LEAD") {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        evaluation: { select: { position: { select: { leaderId: true } } } },
      },
    });
    if (!question) {
      return { success: false, error: "Pregunta no encontrada" };
    }
    if (question.evaluation.position.leaderId !== session.user.id) {
      return {
        success: false,
        error: "Solo el líder del cargo puede realizar esta revisión",
      };
    }
  }

  await prisma.questionReview.upsert({
    where: { questionId_reviewerRole: { questionId, reviewerRole } },
    create: {
      questionId,
      reviewerId: session.user.id,
      reviewerRole,
      ...parsed.data,
    },
    update: { ...parsed.data },
  });

  await computeCalibration(questionId);
  revalidatePath("/evaluations");
  return { success: true };
}

async function computeCalibration(questionId: string) {
  const reviews = await prisma.questionReview.findMany({
    where: { questionId },
    select: {
      reviewerId: true,
      reviewerRole: true,
      relevanceRating: true,
      coherenceRating: true,
      adequacyRating: true,
    },
  });
  const hr = reviews.find((r) => r.reviewerRole === "HR");
  const lead = reviews.find((r) => r.reviewerRole === "AREA_LEAD");

  if (!hr || !lead) {
    await prisma.question.update({
      where: { id: questionId },
      data: { calibrationStatus: "PENDING" },
    });
    return;
  }

  const maxDiff = Math.max(
    Math.abs(hr.relevanceRating - lead.relevanceRating),
    Math.abs(hr.coherenceRating - lead.coherenceRating),
    Math.abs(hr.adequacyRating - lead.adequacyRating),
  );

  if (maxDiff >= 2) {
    await prisma.question.update({
      where: { id: questionId },
      data: { calibrationStatus: "IN_CALIBRATION" },
    });
    return;
  }

  const consensus = {
    relevanceRating: Math.round(
      (hr.relevanceRating + lead.relevanceRating) / 2,
    ),
    coherenceRating: Math.round(
      (hr.coherenceRating + lead.coherenceRating) / 2,
    ),
    adequacyRating: Math.round((hr.adequacyRating + lead.adequacyRating) / 2),
  };

  await prisma.$transaction([
    prisma.questionConsensus.upsert({
      where: { questionId },
      create: {
        questionId,
        resolvedById: hr.reviewerId,
        ...consensus,
        resolvedAt: new Date(),
      },
      update: {
        ...consensus,
        resolvedById: hr.reviewerId,
        resolvedAt: new Date(),
      },
    }),
    prisma.question.update({
      where: { id: questionId },
      data: { calibrationStatus: "RESOLVED" },
    }),
  ]);
}

export async function resolveCalibration(
  questionId: string,
  final: ConsensusInput,
) {
  const session = await requireAuth({ roles: ["ADMIN", "HR"] });
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { calibrationStatus: true },
  });
  if (!question) {
    return { success: false, error: "Pregunta no encontrada" };
  }
  if (question.calibrationStatus !== "IN_CALIBRATION") {
    return {
      success: false,
      error: "La pregunta no requiere calibración",
    };
  }

  const parsed = consensusSchema.safeParse(final);
  if (!parsed.success) {
    return { success: false, error: "Valores finales inválidos (1-5)" };
  }

  await prisma.$transaction([
    prisma.questionConsensus.upsert({
      where: { questionId },
      create: {
        questionId,
        resolvedById: session.user.id,
        ...parsed.data,
        resolvedAt: new Date(),
      },
      update: {
        ...parsed.data,
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      },
    }),
    prisma.question.update({
      where: { id: questionId },
      data: { calibrationStatus: "RESOLVED" },
    }),
  ]);

  revalidatePath("/evaluations");
  return { success: true };
}

export async function activateEvaluation(evaluationId: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const questions = await prisma.question.findMany({
    where: { evaluationId },
    select: { status: true, calibrationStatus: true },
  });

  const hasPending = questions.some((q) => q.status === "PENDING");
  if (hasPending) {
    return {
      success: false,
      error: "Todas las preguntas deben estar revisadas antes de activar",
    };
  }

  const hasRejected = questions.some((q) => q.status === "REJECTED");
  if (hasRejected) {
    return {
      success: false,
      error: "Hay preguntas rechazadas. Editalas o eliminalas antes de activar",
    };
  }

  const allResolved = questions.every(
    (q) => q.calibrationStatus === "RESOLVED",
  );
  if (!allResolved) {
    return {
      success: false,
      error:
        "Toda pregunta debe tener ambas revisiones y discrepancies resueltas antes de activar",
    };
  }

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/evaluations");
  return { success: true };
}

export async function closeEvaluation(evaluationId: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/evaluations");
  return { success: true };
}
