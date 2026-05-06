export const STOPWORDS = new Set([
  'the','a','an','of','for','to','in','on','and','or','with','by','from','as',
  'is','are','be','that','this','it','at','into','vs','via','using','use','new',
  'first','second','third','startup','startups','company','companies','platform',
  'product','tool','tools','solution','service','services',
]);

export function tokens(text) {
  return new Set(String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token)));
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