/**
 * Type definitions for Bizidea YAML artifacts.
 * Mirrors the Zod schema defined in src/content/config.ts for full type safety.
 */

export interface NumberSeries {
  revenueK: number;
  ebitdaK: number;
  cashEopK: number;
}

export interface IdeaRating {
  score: number;
  rationale: string;
}

export interface RatingDimensions {
  market: IdeaRating;
  differentiation: IdeaRating;
  execution: IdeaRating;
  timeliness: IdeaRating;
}

export interface Rating {
  overall: number;
  dimensions: RatingDimensions;
}

export interface Files {
  idea: string;
  research: string;
  businessPlan: string;
  financialModel: string;
}

export interface MarketSizing {
  tam: string | null;
  sam: string | null;
  som: string | null;
}

export interface FundingAsk {
  amountM: number;
  round: string;
  runwayMonths: number;
}

export interface Financials {
  y1: NumberSeries;
  y2: NumberSeries;
  y3: NumberSeries;
  fundingAsk: FundingAsk;
}

export interface ScanConfig {
  timeWindow: string;
  timeWindowLabel: string | null;
}

/**
 * Complete IdeaReport interface representing the full index.yaml schema.
 * This is the authoritative definition consumed by Astro content collection.
 */
export interface IdeaReport {
  // Metadata
  runId: string; // folder name, e.g. "20260426041658-startup-news"
  runTimestamp: string; // 14-digit prefix, e.g. "20260426041658"
  folderSlug: string; // kebab-case after timestamp with hash suffix, e.g. "startup-news-a1b2c3"
  slug: string; // unique slug within collection

  // Publication & Categorization
  date: string; // ISO date string (YYYY-MM-DD)
  topic: string; // headline/title of the idea
  pitch: string; // elevator pitch or brief description
  kicker: string; // attention-grabbing opening line
  sector: string; // industry/market sector

  // Triage Context
  scan: ScanConfig; // original scan parameters

  // Ratings & Scores
  rating: Rating; // overall score + dimensional breakdown

  // File References (relative paths to stage YAMLs)
  files: Files;

  // Market Data
  market: MarketSizing; // TAM, SAM, SOM estimates

  // Financial Projections (3-year model)
  financials: Financials;

  // Risk Assessment
  topRisks: string[]; // list of key risk statements

  // Astro-generated fields (not in source YAML)
  [key: string]: unknown;
}

/**
 * Stage files loaded separately for performance.
 * These are loaded lazily on detail pages, not included in index.yaml.
 */
export interface StageFiles {
  idea: unknown; // Raw parsed YAML from idea.yaml
  research: unknown; // Raw parsed YAML from research.yaml
  businessPlan: unknown; // Raw parsed YAML from business-plan.yaml
  financialModel: unknown; // Raw parsed YAML from financial-model.yaml
}

/**
 * Helper type for YAML loading results.
 */
export interface YamlLoadResult<T = unknown> {
  data: T;
  errors: string[];
  isValid: boolean;
}
