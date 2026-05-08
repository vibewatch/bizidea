import { z } from 'zod';

const nullableString = z.string().nullable();
const maybeString = z.string().optional().nullable();
const maybeNumber = z.number().optional().nullable();
const stringArraySchema = z.array(z.string()).optional();
const textPointSchema = z.object({ point: z.string() }).passthrough();
const citedPointSchema = z.object({
  point: z.string(),
  sourceRefs: z.array(z.number()).optional(),
}).passthrough();

const dateStringSchema = z.preprocess((value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}, z.string());

const numberSeriesSchema = z.object({
  revenueK: z.number(),
  ebitdaK: z.number(),
  cashEopK: z.number(),
});

const ratingDimensionSchema = z.object({
  score: z.number(),
  rationale: z.string(),
});

export const reportIndexSchema = z.object({
  slug: z.string(),
  date: dateStringSchema,
  topic: z.string(),
  pitch: z.string(),
  kicker: z.string(),
  sector: z.string(),
  scan: z.object({
    timeWindow: z.string(),
    timeWindowLabel: nullableString,
  }),
  rating: z.object({
    overall: z.number(),
    dimensions: z.object({
      market: ratingDimensionSchema,
      differentiation: ratingDimensionSchema,
      execution: ratingDimensionSchema,
      timeliness: ratingDimensionSchema,
    }),
  }),
  files: z.object({
    idea: z.string(),
    research: z.string(),
    businessPlan: z.string(),
    financialModel: z.string(),
  }),
  market: z.object({
    tam: nullableString,
    sam: nullableString,
    som: nullableString,
  }),
  financials: z.object({
    y1: numberSeriesSchema,
    y2: numberSeriesSchema,
    y3: numberSeriesSchema,
    fundingAsk: z.object({
      amountM: z.number(),
      round: z.string(),
      runwayMonths: z.number(),
    }),
  }),
  topRisks: z.array(z.string()),
});

const ideaStageSchema = z.object({
  slug: z.string(),
  date: dateStringSchema,
  pitch: z.string(),
  problem: maybeString,
  solution: maybeString,
  differentiator: maybeString,
  sourceContext: z.unknown().optional(),
  whyNow: z.array(textPointSchema).optional(),
  startupThesis: z.object({
    beachhead: maybeString,
    wedge: maybeString,
    nonObviousInsight: maybeString,
    ventureScalePath: maybeString,
    whyNowCatalyst: maybeString,
  }).passthrough(),
  targetUser: z.object({
    primary: maybeString,
    secondary: maybeString,
    buyer: maybeString,
  }).passthrough().optional(),
  goToMarketSeed: z.object({
    firstCustomer: maybeString,
    buyingTrigger: maybeString,
    currentAlternative: maybeString,
    switchingReason: maybeString,
    pricingHypothesis: maybeString,
  }).passthrough().optional(),
  jobsToBeDone: z.array(z.object({
    job: z.string(),
    currentAlternative: z.string(),
    successMetric: z.string(),
  }).passthrough()).optional(),
  conceptDiagram: z.object({
    title: maybeString,
    mermaid: maybeString,
  }).passthrough().optional(),
  ideaScorecard: z.unknown().optional(),
  businessModelCanvas: z.unknown().optional(),
  topRisks: z.array(z.unknown()).optional(),
}).passthrough();

const marketValueSchema = z.object({
  value: maybeString,
  rationale: maybeString,
}).passthrough();

const researchStageSchema = z.object({
  slug: z.string(),
  date: dateStringSchema,
  market: z.object({
    tam: marketValueSchema.optional(),
    sam: marketValueSchema.optional(),
    som: marketValueSchema.optional(),
  }).passthrough(),
  competitors: z.array(z.object({
    name: z.string(),
    stage: maybeString,
    wedge: maybeString,
    pricing: maybeString,
    strength: maybeString,
    weaknessVsUs: maybeString,
  }).passthrough()).optional(),
  sources: z.array(z.object({
    id: z.union([z.number(), z.string()]),
    publisher: maybeString,
    title: maybeString,
    url: maybeString,
  }).passthrough()).optional(),
  reportMemo: z.object({
    executiveTakeaways: z.array(z.string()).optional(),
    marketDefinition: maybeString,
    customerAndBuyer: maybeString,
    buyingTriggers: z.array(citedPointSchema).optional(),
    willingnessToPay: z.object({
      summary: maybeString,
      sourceRefs: z.array(z.number()).optional(),
    }).passthrough().optional(),
    competitiveLandscape: maybeString,
    incumbentThesis: z.array(z.object({
      incumbentClass: z.string(),
      point: z.string(),
    }).passthrough()).optional(),
  }).passthrough().optional(),
  categoryDynamics: z.object({
    growthRate: maybeString,
    tailwinds: z.array(textPointSchema).optional(),
    headwinds: z.array(textPointSchema).optional(),
  }).passthrough().optional(),
  validationSignals: z.array(textPointSchema).optional(),
  regulatoryTechnicalConstraints: z.array(textPointSchema).optional(),
  adoptionFrictionMatrix: z.array(z.object({
    friction: z.string(),
    severity: maybeString,
    affectedBuyer: maybeString,
    mitigation: maybeString,
  }).passthrough()).optional(),
  pestle: z.array(z.object({
    factor: z.string(),
    impact: maybeString,
    point: z.string(),
  }).passthrough()).optional(),
  analysisModels: z.object({
    marketMapDiagram: z.object({
      title: maybeString,
      mermaid: maybeString,
    }).passthrough().optional(),
  }).passthrough().optional(),
  fiveForces: z.record(z.string(), z.object({
    score: maybeNumber,
    rationale: maybeString,
  }).passthrough()).optional(),
}).passthrough();

const businessPlanStageSchema = z.object({
  slug: z.string(),
  date: dateStringSchema,
  executiveSummary: z.string().optional(),
  problem: stringArraySchema,
  solution: stringArraySchema,
  whyWeWin: stringArraySchema,
  strategicChoices: z.object({
    beachhead: maybeString,
    wedgeRationale: maybeString,
    sequencingRationale: maybeString,
    notYet: z.array(z.string()).optional(),
  }).passthrough().optional(),
  market: z.unknown().optional(),
  product: z.object({
    mvp: maybeString,
    sixMonth: maybeString,
    twelveMonth: maybeString,
    twentyFourMonth: maybeString,
    keyBets: z.array(z.string()).optional(),
  }).passthrough().optional(),
  gtm: z.object({
    wedge: maybeString,
    channels: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    funnelTargets: maybeString,
    pricing: maybeString,
  }).passthrough().optional(),
  milestones: z.array(z.object({
    horizon: z.string(),
    items: z.array(z.string()).optional(),
  }).passthrough()).optional(),
  businessModel: z.object({
    revenueStreams: z.array(z.string()).optional(),
    unitOfValue: maybeString,
    targetGrossMarginPct: maybeNumber,
    expansionLevers: z.array(z.string()).optional(),
  }).passthrough().optional(),
  strategyMap: z.object({
    northStarMetric: maybeString,
    inputMetrics: z.array(z.string()).optional(),
    moatsToBuild: z.array(z.string()).optional(),
    killCriteria: z.array(z.string()).optional(),
    mermaid: maybeString,
  }).passthrough().optional(),
  team: z.array(z.object({
    role: z.string(),
    startTiming: maybeString,
    rationale: maybeString,
  }).passthrough()).optional(),
  experimentRoadmap: z.array(z.object({
    horizon: z.string(),
    experiment: z.string(),
    hypothesis: z.string(),
    successMetric: z.string(),
    owner: maybeString,
  }).passthrough()).optional(),
  risks: z.array(z.object({
    risk: z.string(),
    likelihood: maybeString,
    impact: maybeString,
    mitigation: maybeString,
  }).passthrough()).optional(),
  fundingAsk: z.unknown().optional(),
  investorMemo: z.object({
    firstCustomer: z.object({
      title: maybeString,
      profile: maybeString,
      trigger: maybeString,
      buyer: maybeString,
      initialContract: maybeString,
    }).passthrough().optional(),
    mustBeTrue: z.array(z.string()).optional(),
    diligenceQuestions: z.array(z.string()).optional(),
    verdict: z.object({
      call: maybeString,
      conviction: maybeString,
      whyBelieve: maybeString,
      whyDoubt: maybeString,
      nextDiligence: maybeString,
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

const financialPeriodSchema = z.object({
  revenueK: z.number().optional(),
  ebitdaK: z.number().optional(),
  cashEopK: z.number().optional(),
}).passthrough();

export const financialModelStageSchema = z.object({
  slug: z.string(),
  date: dateStringSchema,
  totals: z.object({
    y1: numberSeriesSchema.optional(),
    y2: numberSeriesSchema.optional(),
    y3: numberSeriesSchema.optional(),
  }).passthrough(),
  unitEconomics: z.object({
    arpuAnnualK: maybeNumber,
    grossMarginPct: maybeNumber,
    cacK: maybeNumber,
    cacPaybackMonths: maybeNumber,
    ltvK: maybeNumber,
    ltvCacRatio: maybeNumber,
  }).passthrough().optional(),
  fundingAsk: z.object({
    amountM: z.number().optional(),
    round: z.string().optional(),
    runwayMonths: z.number().optional(),
    milestone: maybeString,
    useOfFunds: z.array(z.unknown()).optional(),
  }).passthrough(),
  modelSanity: z.array(z.object({
    checkName: z.string(),
    finding: z.string(),
  }).passthrough()).optional(),
  y1Monthly: z.array(financialPeriodSchema).optional(),
  y2y3Quarterly: z.array(financialPeriodSchema).optional(),
  scenarios: z.object({
    downside: z.object({
      description: maybeString,
      y3RevenueK: maybeNumber,
      y3EbitdaK: maybeNumber,
      cashLowPointK: maybeNumber,
      keyAssumptionChanges: z.array(z.string()).optional(),
    }).passthrough().optional(),
    base: z.object({
      description: maybeString,
      y3RevenueK: maybeNumber,
      y3EbitdaK: maybeNumber,
      cashLowPointK: maybeNumber,
      keyAssumptionChanges: z.array(z.string()).optional(),
    }).passthrough().optional(),
    upside: z.object({
      description: maybeString,
      y3RevenueK: maybeNumber,
      y3EbitdaK: maybeNumber,
      cashLowPointK: maybeNumber,
      keyAssumptionChanges: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
  sensitivity: z.array(z.object({
    variable: z.unknown().optional(),
    downsideCase: z.unknown().optional(),
    baseCase: z.unknown().optional(),
    upsideCase: z.unknown().optional(),
    cashImpactK: maybeNumber,
    y3RevenueImpactK: maybeNumber,
  }).passthrough()).optional(),
  assumptions: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    value: z.unknown().optional(),
    unit: z.unknown().optional(),
    source: z.unknown().optional(),
  }).passthrough()).optional(),
  modelDiagram: z.object({
    title: maybeString,
    mermaid: maybeString,
  }).passthrough().optional(),
  sanityChecks: z.object({
    flags: z.array(z.string()).optional(),
  }).passthrough().optional(),
}).passthrough();

export const stageFileSchemas = {
  idea: ideaStageSchema,
  research: researchStageSchema,
  businessPlan: businessPlanStageSchema,
  financialModel: financialModelStageSchema,
};

export type IdeaStage = z.infer<typeof ideaStageSchema>;
export type ResearchStage = z.infer<typeof researchStageSchema>;
export type BusinessPlanStage = z.infer<typeof businessPlanStageSchema>;
export type FinancialModelStage = z.infer<typeof financialModelStageSchema>;

export interface StageFiles {
  idea: IdeaStage;
  research: ResearchStage;
  businessPlan: BusinessPlanStage;
  financialModel: FinancialModelStage;
}
