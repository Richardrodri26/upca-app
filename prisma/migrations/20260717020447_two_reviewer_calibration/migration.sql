/*
  Warnings:

  - You are about to drop the column `adequacyRating` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `coherenceRating` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `relevanceRating` on the `Question` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('HR', 'AREA_LEAD');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('PENDING', 'IN_CALIBRATION', 'RESOLVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'AREA_LEAD';

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "leaderId" TEXT;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "adequacyRating",
DROP COLUMN "coherenceRating",
DROP COLUMN "relevanceRating",
ADD COLUMN     "calibrationStatus" "CalibrationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "QuestionReview" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" "ReviewerRole" NOT NULL,
    "relevanceRating" INTEGER NOT NULL,
    "coherenceRating" INTEGER NOT NULL,
    "adequacyRating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionConsensus" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "relevanceRating" INTEGER NOT NULL,
    "coherenceRating" INTEGER NOT NULL,
    "adequacyRating" INTEGER NOT NULL,
    "resolvedById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionConsensus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionReview_reviewerId_idx" ON "QuestionReview"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReview_questionId_reviewerRole_key" ON "QuestionReview"("questionId", "reviewerRole");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionConsensus_questionId_key" ON "QuestionConsensus"("questionId");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionConsensus" ADD CONSTRAINT "QuestionConsensus_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionConsensus" ADD CONSTRAINT "QuestionConsensus_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
