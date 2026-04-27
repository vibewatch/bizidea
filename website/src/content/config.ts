import { defineCollection, z } from 'astro:content';
import { ideasLoader } from './ideas-loader';

const numberSeries = z.object({
  revenueK: z.number(),
  ebitdaK: z.number(),
  cashEopK: z.number(),
});

// js-yaml parses ISO dates as Date objects; coerce them to YYYY-MM-DD strings.
const dateString = z.preprocess((v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}, z.string());

const ideas = defineCollection({
  loader: ideasLoader(),
  schema: z.object({
    runId: z.string(), // folder name, e.g. 20260426041658-startup-news
    runTimestamp: z.string(), // 14-digit prefix
    folderSlug: z.string(), // kebab-case after timestamp
    slug: z.string(),
    date: dateString,
    topic: z.string(),
    pitch: z.string(),
    kicker: z.string(),
    sector: z.string(),
    scan: z.object({
      timeWindow: z.string(),
      timeWindowLabel: z.string().nullable(),
    }),
    rating: z.object({
      overall: z.number(),
      dimensions: z.object({
        market: z.object({ score: z.number(), rationale: z.string() }),
        differentiation: z.object({ score: z.number(), rationale: z.string() }),
        execution: z.object({ score: z.number(), rationale: z.string() }),
        timeliness: z.object({ score: z.number(), rationale: z.string() }),
      }),
    }),
    files: z.object({
      idea: z.string(),
      research: z.string(),
      businessPlan: z.string(),
      financialModel: z.string(),
    }),
    market: z.object({
      tam: z.string().nullable(),
      sam: z.string().nullable(),
      som: z.string().nullable(),
    }),
    financials: z.object({
      y1: numberSeries,
      y2: numberSeries,
      y3: numberSeries,
      fundingAsk: z.object({
        amountM: z.number(),
        round: z.string(),
        runwayMonths: z.number(),
      }),
    }),
    topRisks: z.array(z.string()),
  }),
});

export const collections = { ideas };
