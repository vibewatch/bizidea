export const STOPWORDS = new Set([
  'the','a','an','of','for','to','in','on','and','or','with','by','from','as',
  'is','are','be','that','this','it','at','into','vs','via','using','use','new',
  'first','second','third','startup','startups','company','companies','platform',
  'product','tool','tools','solution','service','services',
]);

export const TITLE_CLICHES = [
  /\boperating system\b/i,
  /\bcontrol plane\b/i,
  /\bcontrol tower\b/i,
  /\bcopilot\b/i,
  /\bautopilot\b/i,
  /\bcommand cent(?:er|re)\b/i,
  /\bsingle pane\b/i,
  /\bone[- ]stop\b/i,
  /\bend[- ]to[- ]end platform\b/i,
  /\bai[- ]powered platform\b/i,
];

export function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export function tokens(text) {
  return new Set(words(text).filter((token) => token.length >= 4));
}

export function shingles(text, size = 2) {
  const list = words(text);
  const out = new Set();
  for (let i = 0; i <= list.length - size; i += 1) {
    out.add(list.slice(i, i + size).join(' '));
  }
  return out;
}

export function intersectionSize(a, b) {
  let count = 0;
  for (const item of a) if (b.has(item)) count += 1;
  return count;
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  const intersection = intersectionSize(a, b);
  return intersection / (a.size + b.size - intersection);
}

export function conceptText(idea) {
  return [
    idea?.pitch,
    idea?.problem,
    idea?.startupThesis?.nonObviousInsight,
    idea?.startupThesis?.beachhead,
    idea?.startupThesis?.wedge,
    idea?.startupThesis?.ventureScalePath,
    idea?.goToMarketSeed?.firstCustomer,
    idea?.goToMarketSeed?.currentAlternative,
    idea?.goToMarketSeed?.switchingReason,
    idea?.solution,
  ].filter(Boolean).join(' ');
}

export function compactConceptText(value) {
  return [
    value?.pitch,
    value?.startupThesis?.beachhead ?? value?.beachhead,
    value?.startupThesis?.wedge ?? value?.wedge,
    value?.targetUser?.primary ?? value?.targetUserPrimary,
  ].filter(Boolean).join(' ');
}

export function conceptSimilarity(aText, bText) {
  return {
    token: jaccard(tokens(aText), tokens(bText)),
    bigram: jaccard(shingles(aText), shingles(bText)),
  };
}

export function findTitleCliche(...values) {
  const text = values.filter(Boolean).join(' ');
  return TITLE_CLICHES.find((pattern) => pattern.test(text))?.source ?? null;
}