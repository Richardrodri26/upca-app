import { z } from "zod";

export const reviewQuestionSchema = z.object({
  relevanceRating: z.number().int().min(1).max(5),
  coherenceRating: z.number().int().min(1).max(5),
  adequacyRating: z.number().int().min(1).max(5),
});

export type ReviewQuestionInput = z.infer<typeof reviewQuestionSchema>;

export const consensusSchema = z.object({
  relevanceRating: z.number().int().min(1).max(5),
  coherenceRating: z.number().int().min(1).max(5),
  adequacyRating: z.number().int().min(1).max(5),
});

export type ConsensusInput = z.infer<typeof consensusSchema>;
