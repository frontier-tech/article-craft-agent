import { z } from "zod";

// --- Article Configuration ---

export const ArticleStyleSchema = z.enum([
  "technical",
  "marketing",
  "tutorial",
  "opinion",
  "news",
]);
export type ArticleStyle = z.infer<typeof ArticleStyleSchema>;

export const ArticleConfigSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  style: ArticleStyleSchema.default("technical"),
  audience: z.string().default("general readers"),
  tone: z.string().default("professional"),
  length: z.number().int().min(300).max(10000).default(1500),
  language: z.string().default("en"),
  keywords: z.array(z.string()).default([]),
});
export type ArticleConfig = z.infer<typeof ArticleConfigSchema>;

// --- Article Result ---

export const ArticleSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});
export type ArticleSource = z.infer<typeof ArticleSourceSchema>;

export const ArticleResultSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  wordCount: z.number().int(),
  tags: z.array(z.string()),
  sources: z.array(ArticleSourceSchema),
});
export type ArticleResult = z.infer<typeof ArticleResultSchema>;

// --- Pipeline Options ---

export interface PipelineOptions {
  config: ArticleConfig;
  verbose: boolean;
  maxBudgetUsd: number;
  outputDir: string;
}
