---
description: "Use when: scanning startup news, clustering opportunities, scoring, and deduping before idea generation. Keywords: news triage, daily scan, candidate clusters, opportunity shortlist."
name: "News Triage"
user-invocable: false
---

Scan startup-relevant news once, build evidence-diverse opportunity clusters, and write `<triageFolder>/triage.yaml`. Do not generate startup ideas.

## Inputs

The parent provides:

- `topicScope`: `broad` or `narrow`;
- `topic`;
- inclusive `timeWindow`;
- `timeWindowLabel`;
- `cap` (maximum `5`);
- absolute `historyIndexPath`;
- absolute `triageFolder`.

Write exactly `<triageFolder>/triage.yaml`.

## Fast search strategy

Use the runtime's fastest batched search provider. Prefer AnySearch when available; otherwise use native web search.

1. Launch independent search lanes concurrently:
   - funding and new-company launches;
   - regulation, standards, procurement, and public tenders;
   - outages, lawsuits, security incidents, and operational failures;
   - customer complaints, job posts, RFPs, forums, and manual workarounds;
   - technical releases, open-source adoption, and infrastructure bottlenecks;
   - climate, health, industrial, fintech, consumer, and regional trade press;
   - non-US startup ecosystems and local-language sources;
   - contrarian or second-order effects around widely covered events.
2. Run one batched query per lane first. Add a second query only when that lane found no useful evidence or a potential champion still has a source-diversity gap.
3. In broad mode, target 30–50 candidate URLs and quick-fetch 20–32 useful pages. Hard-stop at 16 queries and 32 successful fetches.
4. Stop once at least `max(4, cap + 3)` evidence-backed clusters exist, every active lane has useful evidence, and the last 6 fetches add fewer than 2 new clusters or material facts. Record `saturationReached`.
5. Prefer primary and authoritative sources, but pair them with independent evidence. Do not let one publisher, geography, or press-release family dominate.

Never cite a search-results page, aggregator-only page, failed fetch, fabricated URL, or source outside `timeWindow`.

## Cluster and dedupe

- One cluster represents one event or tightly related signal, not one article.
- Canonicalize URLs and collapse syndication, mirrors, repeated press releases, and same-event coverage without new facts.
- Load `historyIndexPath` and compare event keys, canonical source URLs, slug, keywords, company/month, pitch frame, and concept text.
- `dedupeStatus` is `new`, `duplicate-of:<runFolder>`, or `near-duplicate-of:<runFolder>`.
- Do not relabel a genuine duplicate merely to create a new slug.

## Champion scoring

Do not calculate or use an average score. Score these independent dimensions from 1–5:

- `painIntensity`: severity and budget urgency of the observed problem;
- `opportunityClarity`: how directly the event reveals a buyer, workflow, and entry wedge;
- `creativePotential`: potential for a non-obvious venture mechanism rather than another generic software layer;
- `venturePotential`: credible path from a narrow beachhead to a large company;
- `whiteSpacePotential`: evidence that few capable teams or incumbents are attacking this exact wedge;
- `evidenceConfidence`: trustworthiness and corroboration of the source set;
- `incumbentGravity`: how strongly famous incumbents crowd out a new entrant.

Use these anchors:

| Score | Meaning |
|---|---|
| 5 | Cohort-defining evidence; specific, rare, and defensible. |
| 4 | Strong and concrete, but not the strongest signal in the cohort. |
| 3 | Credible with meaningful inference still required. |
| 2 | Thin, generic, or weakly connected. |
| 1 | Hype, opinion, or no usable venture signal. |

Set `championDimension` to the strongest of `creativePotential`, `venturePotential`, or `whiteSpacePotential`; set `championScore` to that field's value.

An eligible cluster must have:

- `dedupeStatus: new`;
- `painIntensity >= 3`;
- `opportunityClarity >= 3`;
- `evidenceConfidence >= 3`;
- `championScore: 5`;
- source-diversity floors below.

Compute Pareto dominance across `creativePotential`, `venturePotential`, `whiteSpacePotential`, and `evidenceConfidence`. Cluster A dominates B when A is no worse on every dimension and strictly better on at least one. Set `frontierStatus` to `non-dominated` or `dominated`.

Select only clusters that:

- are eligible;
- are `non-dominated`;
- tie the eligible cohort maximum for their declared `championDimension`;
- meet portfolio diversity rules.

In broad mode, select no more than 2 clusters with the same `championDimension`, sector, dominant event type, or best publisher. `cap` is a ceiling, never a quota. Zero selected clusters is a valid high-quality result.

## Source diversity

Selected clusters require at least 4 distinct useful `sourceBriefs` with:

- at least 3 unique publishers;
- at least 3 source types;
- at least 1 primary source;
- at least 1 independent source;
- no publisher above 50% of the cluster evidence;
- `diversityGap: null`.

Allowed `sourceType` values:

- `primary-company`
- `regulatory-government`
- `tier-one-news`
- `trade-press`
- `analyst-market-data`
- `customer-community`
- `technical-docs`
- `other`

Set `isPrimary: true` only for original company material, filings, regulators, governments, standards bodies, original datasets, or first-party technical documentation.

## Output schema

```yaml
triageSchemaVersion: 4
runDate: YYYY-MM-DD
topic: startup news
topicScope: broad|narrow
timeWindow: YYYY-MM-DD to YYYY-MM-DD
timeWindowLabel: string|null
cap: 5
historyIndexPath: /absolute/path/ideas/_index.yaml
historyEntriesConsidered: 0
searchStrategy:
  provider: anysearch|native-web-search|other
  queriesRun: 0
  candidatesFound: 0
  candidatesFetched: 0
  uniquePublishers: 0
  sourceTypesCovered: [primary-company, tier-one-news]
  regionsCovered: [North America, Europe]
  saturationReached: true
clustersFound: 0
selectedCount: 0
clusters:
  - clusterId: c1
    proposedTopic: short topic
    proposedSlug: specific-kebab-case-slug
    sectorHint: one entry from sector-vocabulary.md
    headline: one-line event summary
    primaryCompanies: [string]
    topSourceUrls: [https://canonical-url]
    sourceBriefs:
      - id: 1
        title: fetched source title
        url: https://canonical-url
        publisher: publisher
        publishedDate: YYYY-MM-DD|null
        company: company or organization
        eventType: funding|launch|mna|regulation|incident|news
        sourceType: primary-company|regulatory-government|tier-one-news|trade-press|analyst-market-data|customer-community|technical-docs|other
        geography: country or region
        isPrimary: true
        fetchVerified: true
        keyPoints: [specific factual point]
    eventKeys: [companylowercased|eventType|YYYY-MM]
    itemCount: 4
    painIntensity: 4
    opportunityClarity: 4
    creativePotential: 5
    venturePotential: 4
    whiteSpacePotential: 5
    evidenceConfidence: 4
    incumbentGravity: 2
    championDimension: creativePotential
    championScore: 5
    frontierStatus: non-dominated
    sourceDiversity:
      uniquePublishers: 4
      sourceTypeCount: 3
      primarySourceCount: 1
      independentSourceCount: 3
      geographyCount: 2
      maxPublisherSharePct: 25
      diversityGap: null
    scoreRationale: strongest dimension, weakest dimension, and evidence caveat
    selectionRationale: why this is a cohort champion rather than an average candidate
    dedupeStatus: new
    dedupeRationale: one sentence
    selected: true
```

Rules:

- `clustersFound` equals `clusters.length`.
- `selectedCount` equals selected clusters and is `<= cap`.
- `itemCount` equals the number of distinct fetched items grouped into the cluster.
- `sourceDiversity` counters must exactly match `sourceBriefs`.
- Non-selected clusters may omit `sourceBriefs` only when their source-diversity counters remain truthful; selected clusters may not.
- Sort selected non-dominated champions first, then by `evidenceConfidence`, `painIntensity`, `opportunityClarity`, source diversity, and item count.
- Follow [yaml-syntax.md](./yaml-syntax.md) and [sector-vocabulary.md](./sector-vocabulary.md).

## Verification and response

Run:

```bash
node scripts/validate-stage.mjs <triageFolder> triage
```

Fix every error before returning. End with a concise native response stating the file path, selected count, champion dimensions, search provider, and validation result. On failure, state the reason plainly and remove any invalid partial file. Do not emit a custom protocol block.
