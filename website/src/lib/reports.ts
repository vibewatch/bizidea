import type { CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export const HOMEPAGE_REPORT_LIMIT = 15;

export function sortIdeasNewestFirst(entries: CollectionEntry<'ideas'>[]): CollectionEntry<'ideas'>[] {
  return [...entries].sort((a, b) => b.data.runTimestamp.localeCompare(a.data.runTimestamp));
}

export interface ReportMonthGroup {
  slug: string;
  label: string;
  entries: CollectionEntry<'ideas'>[];
}

export function monthSlugForTimestamp(runTimestamp: string): string {
  if (!/^\d{6}/.test(runTimestamp)) return 'unknown';
  return `${runTimestamp.slice(0, 4)}-${runTimestamp.slice(4, 6)}`;
}

export function formatMonthLabel(monthSlug: string, lang: Lang = 'en'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthSlug);
  if (!match) return monthSlug;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (lang === 'zh') return `${year}年${month}月`;
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function groupIdeasByMonth(entries: CollectionEntry<'ideas'>[], lang: Lang = 'en'): ReportMonthGroup[] {
  const groups = new Map<string, CollectionEntry<'ideas'>[]>();
  for (const entry of sortIdeasNewestFirst(entries)) {
    const slug = monthSlugForTimestamp(entry.data.runTimestamp);
    const existing = groups.get(slug) ?? [];
    existing.push(entry);
    groups.set(slug, existing);
  }
  return [...groups.entries()].map(([slug, monthEntries]) => ({
    slug,
    label: formatMonthLabel(slug, lang),
    entries: monthEntries,
  }));
}
