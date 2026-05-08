export const reportIndexFixture = {
  slug: 'fixture-ai-workflow',
  date: '2026-05-08',
  topic: 'fixture topic',
  pitch: 'Workflow QA for agent-generated startup reports.',
  kicker: 'FIXTURE',
  sector: 'dev-tools',
  scan: {
    timeWindow: '2026-05-07 to 2026-05-07',
    timeWindowLabel: 'yesterday',
  },
  rating: {
    overall: 3.7,
    dimensions: {
      market: { score: 4, rationale: 'Large enough market.' },
      differentiation: { score: 4, rationale: 'Specific wedge.' },
      execution: { score: 3, rationale: 'Clear but early.' },
      timeliness: { score: 3, rationale: 'Recent signal.' },
    },
  },
  files: {
    idea: 'idea.yaml',
    research: 'research.yaml',
    businessPlan: 'business-plan.yaml',
    financialModel: 'financial-model.yaml',
  },
  market: {
    tam: '$1.0B',
    sam: '$100.0M',
    som: '$5.0M',
  },
  financials: {
    y1: { revenueK: 120, ebitdaK: -300, cashEopK: 1700 },
    y2: { revenueK: 900, ebitdaK: -200, cashEopK: 1500 },
    y3: { revenueK: 2500, ebitdaK: 200, cashEopK: 1700 },
    fundingAsk: { amountM: 2, round: 'pre-seed', runwayMonths: 24 },
  },
  topRisks: ['Adoption risk', 'Incumbent bundling', 'Data quality'],
};

export const financialModelFixture = {
  slug: 'fixture-ai-workflow',
  date: new Date('2026-05-08T00:00:00Z'),
  totals: {
    y1: { revenueK: 120, ebitdaK: -300, cashEopK: 1700 },
    y2: { revenueK: 900, ebitdaK: -200, cashEopK: 1500 },
    y3: { revenueK: 2500, ebitdaK: 200, cashEopK: 1700 },
  },
  fundingAsk: {
    amountM: 2,
    round: 'pre-seed',
    runwayMonths: 24,
    useOfFunds: [
      { bucket: 'Engineering', percentage: 50, amountUsd: 1_000_000 },
      { bucket: 'GTM', percentage: 30, amountUsd: 600_000 },
      { bucket: 'Ops', percentage: 20, amountUsd: 400_000 },
    ],
  },
  unitEconomics: {
    arpuAnnualK: 50,
    grossMarginPct: 72,
    cacK: 12,
    ltvK: 120,
    ltvCacRatio: 10,
  },
  modelSanity: [
    { checkName: 'Revenue engine', finding: 'Logo growth drives revenue.' },
    { checkName: 'Must go right', finding: 'Sales cycle compresses.' },
    { checkName: 'Model breaks if', finding: 'Retention misses.' },
    { checkName: 'Next-round proof', finding: 'Y3 growth inflects.' },
  ],
  y1Monthly: [
    { month: 'M1', revenueK: 10, ebitdaK: -40, cashEopK: 1960 },
    { month: 'M2', revenueK: 20, ebitdaK: -35, cashEopK: 1925 },
  ],
  y2y3Quarterly: [
    { quarter: 'Q1Y2', revenueK: 100, ebitdaK: -50, cashEopK: 1800 },
    { quarter: 'Q2Y2', revenueK: 150, ebitdaK: -25, cashEopK: 1775 },
  ],
  headcount: [
    { role: 'Engineering', q1y1: 2, q4y1: 5, q2y2: 7 },
    { role: 'Sales', q1y1: 0, q4y1: 1, q2y2: 3 },
  ],
  sensitivity: [
    {
      variable: 'gross margin',
      downsideCase: '60 percent',
      upsideCase: '80 percent',
      cashImpactK: -200,
      y3RevenueImpactK: 100,
    },
    {
      variable: 'ARPU',
      downsideCase: 'USD per month',
      upsideCase: 'annualized',
      cashImpactK: -50,
      y3RevenueImpactK: 300,
    },
  ],
  scenarios: {
    downside: { description: 'Slower pilots', y3RevenueK: 1200, y3EbitdaK: -300, cashLowPointK: -100 },
    base: { description: 'Planned ramp', y3RevenueK: 2500, y3EbitdaK: 200, cashLowPointK: 400 },
    upside: { description: 'Expansion wins', y3RevenueK: 4200, y3EbitdaK: 900, cashLowPointK: 800 },
  },
};
