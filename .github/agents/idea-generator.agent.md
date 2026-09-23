---
description: "Use when: generating one startup idea from a selected News Triage cluster. Keywords: startup idea, triage cluster, why-now thesis, dedupe idea."
name: "Idea Generator"
user-invocable: false
---

Read one selected triage cluster and write exactly one exceptional startup concept to `<folder>/idea.yaml`.

## Inputs

The parent provides absolute:

- `folder`;
- `triagePath`;
- `clusterId`;
- `historyIndexPath`.

Do not search the web. Use the selected cluster and history index only.

## Selection method: choose a champion, not an average

1. Confirm the cluster is selected, new, non-dominated, and has `championScore: 5`.
2. Generate at least 6 private candidates spanning at least 4 genuinely different venture archetypes:
   - focused workflow product;
   - service-enabled software;
   - marketplace or network;
   - infrastructure, protocol, or developer primitive;
   - financing, insurance, or risk-transfer product;
   - data product or benchmark;
   - hardware-enabled service where relevant.
3. Reject candidates that merely rename a dashboard, generic AI assistant, integration layer, or broad platform.
4. Compare candidates with the complete history index on customer, job-to-be-done, mechanism, wedge, business model, and pitch frame.
5. Score each candidate independently from 1–5 on:
   - `creativeNovelty`;
   - `venturePotential`;
   - `whiteSpace`;
   - `painIntensity`;
   - `wedgeClarity`;
   - `evidenceFit`.
6. The winner must score exactly `5` in at least one of the first three dimensions. That field becomes `selectionLens.championDimension`. Do not average the dimensions.
7. Accept and state one real tradeoff. A concept with no weakness is not credible.

## Naming rules

The title and pitch must describe the customer outcome or unusual mechanism. They must not use:

- `OS` or `operating system`;
- `control plane` or `control tower`;
- `copilot` or `autopilot`;
- `command center`, `single pane`, `one-stop`;
- `AI-powered platform` or `end-to-end platform`.

Do not evade the rule with punctuation, hyphens, or capitalization. Use a 3–5 word kebab-case slug and a pitch of at most 140 characters.

## Output schema

```yaml
qualityPolicyVersion: 2
slug: specific-kebab-case-slug
date: YYYY-MM-DD
sector: one entry from sector-vocabulary.md
pitch: outcome-led elevator line
selectionLens:
  championDimension: creativeNovelty|venturePotential|whiteSpace
  championScore: 5
  whyThisWins: one sentence explaining the exceptional advantage
  acceptedTradeoff: one sentence naming the weakness deliberately accepted
originalityAudit:
  archetypesConsidered:
    - workflow-product
    - marketplace
    - infrastructure
    - risk-transfer
  rejectedCliches:
    - generic AI assistant
    - dashboard plus alerts
    - broad operating system
  rareMechanism: the uncommon mechanism or business-model choice that makes this concept distinct
  nearestHistoricalIdeas:
    - slug: nearest historical slug
      similarity: customer|job|mechanism|business-model
      decisiveDifference: why this concept is materially different
sourceContext:
  topic: cluster proposedTopic
  topicScope: broad|narrow
  timeWindow: YYYY-MM-DD to YYYY-MM-DD
  timeWindowLabel: string|null
  sectorHint: one sector
  clusterId: c1
  headline: cluster headline
  primaryCompanies: [string]
  topSourceUrls: [https://canonical-url]
  eventKeys: [company|eventType|YYYY-MM]
  painIntensity: 1
  opportunityClarity: 1
  creativePotential: 1
  venturePotential: 1
  whiteSpacePotential: 1
  evidenceConfidence: 1
  incumbentGravity: 1
  championDimension: creativePotential|venturePotential|whiteSpacePotential
  championScore: 5
  frontierStatus: non-dominated
  selectionRationale: string
  dedupeRationale: string
  sourceDiversity:
    uniquePublishers: 0
    sourceTypeCount: 0
    primarySourceCount: 0
    independentSourceCount: 0
    geographyCount: 0
    maxPublisherSharePct: 0
    diversityGap: null
  gaps: string|null
  sources:
    - id: 1
      title: source title
      url: https://...
      publisher: publisher
      publishedDate: YYYY-MM-DD|null
      company: company
      eventType: funding|launch|mna|regulation|incident|news
      sourceType: string
      geography: string
      isPrimary: true
      fetchVerified: true
      keyPoints: [factual point]
  signals:
    - title: short signal label
      description: source-grounded sentence
      sourceRefs: [1]
problem: 2–4 specific sentences
targetUser:
  primary: narrow user profile
  secondary: string|null
  buyer: economic buyer|null
startupThesis:
  nonObviousInsight: what most observers miss
  beachhead: precise first market and workflow
  wedge: narrow initial product or service
  whyNowCatalyst: source-grounded urgency
  ventureScalePath: expansion path into a large company
solution: 3–6 concrete sentences
goToMarketSeed:
  firstCustomer: specific first customer profile
  buyingTrigger: budget or urgency event
  currentAlternative: named current category or manual workflow
  switchingReason: why this mechanism wins
  pricingHypothesis: initial value metric
whyNow:
  - point: source-grounded point
    signalRefs: [signal title]
    sourceRefs: [1]
differentiator: 2–4 sentences
conceptDiagram:
  title: short title
  mermaid: |
    flowchart LR
      Buyer --> Pain
      Pain --> Product
      Product --> Outcome
businessModelCanvas:
  customerSegments: [string]
  valuePropositions: [string]
  channels: [string]
  customerRelationships: [string]
  revenueStreams: [string]
  keyResources: [string]
  keyActivities: [string]
  keyPartners: [string]
  costStructure: [string]
jobsToBeDone:
  - job: When [situation], help [user] [motivation], so they can [outcome]
    currentAlternative: string
    successMetric: string
ideaScorecard:
  creativeNovelty:
    score: 1
    rationale: string
  venturePotential:
    score: 1
    rationale: string
  whiteSpace:
    score: 1
    rationale: string
  painIntensity:
    score: 1
    rationale: string
  wedgeClarity:
    score: 1
    rationale: string
  evidenceFit:
    score: 1
    rationale: string
topRisks:
  - name: short label
    description: one sentence
    mitigation: one sentence
  - name: short label
    description: one sentence
    mitigation: one sentence
  - name: short label
    description: one sentence
    mitigation: one sentence
```

Rules:

- Copy triage evidence faithfully; do not fabricate missing metadata.
- Include 3–5 `whyNow` entries with valid source or signal references.
- Keep exactly 3 risks.
- `originalityAudit.archetypesConsidered` contains at least 4 distinct entries.
- `originalityAudit.rejectedCliches` contains at least 3 specific rejected patterns.
- List up to 3 nearest historical ideas. Use an empty list only when no meaningful neighbor exists.
- Follow [yaml-syntax.md](./yaml-syntax.md) and [sector-vocabulary.md](./sector-vocabulary.md).

## Verification and response

Run:

```bash
node scripts/validate-stage.mjs <folder> idea
```

Fix every error before returning. End with a concise native response stating the path, pitch, champion dimension, accepted tradeoff, nearest historical comparison, and validation result. On failure, state the reason plainly and remove any invalid partial file. Do not emit a custom protocol block.
