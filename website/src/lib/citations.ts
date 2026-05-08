// HTML-safe citation linkifier for use with `set:html`.
// Converts `[N]` and `[N,N,...]` tokens into citation anchors.

import { citationAriaLabel, type Lang } from './i18n';

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c]!);

export type CitationPart = string | { id: string };

const CITATION_TOKEN_RE = /\[((?:\d+\s*,\s*)*\d+)\]/g;

export function splitCitationText(text: string | null | undefined): CitationPart[] {
  if (!text) return [];

  const value = String(text);
  const parts: CitationPart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = CITATION_TOKEN_RE.exec(value))) {
    if (match.index > last) parts.push(value.slice(last, match.index));
    for (const id of match[1]!.split(',').map((n) => n.trim()).filter(Boolean)) {
      parts.push({ id });
    }
    last = match.index + match[0].length;
  }

  if (last < value.length) parts.push(value.slice(last));
  return parts;
}

export function linkifyCitations(text: string | null | undefined, lang: Lang = 'en'): string {
  return splitCitationText(text)
    .map((part) => typeof part === 'string'
      ? escapeHtml(part)
      : `<a class="bz-cite" href="#cite-${part.id}" aria-label="${escapeHtml(citationAriaLabel(part.id, lang))}">[${part.id}]</a>`)
    .join('');
}
