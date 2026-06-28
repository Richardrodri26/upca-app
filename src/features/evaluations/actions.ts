"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { revalidatePath } from "next/cache";
import { generateEvaluation as ragGenerate } from "@/lib/rag-client";

const DEFAULT_ENFOQUE = "Desempeño general de funciones y responsabilidades";
import type { EvaluationStatus, QuestionStatus } from "@/generated/prisma/client";

// ────────────────────────────────────────
// Queries
// ────────────────────────────────────────

export async function getEvaluations(status?: EvaluationStatus) {
  const where = status ? { status } : {};

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
  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      position: { select: { id: true, name: true } },
      manual: { select: { id: true, fileName: true } },
      createdBy: { select: { id: true, name: true } },
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  return evaluation;
}

export async function getPositionsWithProcessedManual() {
  const positions = await prisma.position.findMany({
    where: {
      manual: { status: "PROCESSED" },
    },
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

export async function generateEvaluation(
  positionId: string,
  enfoque?: string,
) {
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

  // Create evaluation + questions in a transaction
  const evaluation = await prisma.$transaction(async (tx) => {
    const eval_ = await tx.evaluation.create({
      data: {
        title: `Evaluación - ${position.name}`,
        status: "REVIEW",
        generationTime: result.data.generationTimeMs / 1000,
        positionId: position.id,
        manualId: position.manual!.id,
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

export async function rateQuestion(
  id: string,
  ratings: {
    relevanceRating: number;
    coherenceRating: number;
    adequacyRating: number;
  },
) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  await prisma.question.update({
    where: { id },
    data: ratings,
  });

  return { success: true };
}

export async function activateEvaluation(evaluationId: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const questions = await prisma.question.findMany({
    where: { evaluationId },
    select: { status: true },
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
      error:
        "Hay preguntas rechazadas. Editalas o eliminalas antes de activar",
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
