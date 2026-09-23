import type { CollectionEntry } from 'astro:content';
import { localizeSector, type Lang } from './i18n';

export const HOMEPAGE_REPORT_LIMIT = 15;
export const RELATED_DOSSIER_LIMIT = 3;

export function sortIdeasNewestFirst(entries: CollectionEntry<'ideas'>[]): CollectionEntry<'ideas'>[] {
  return [...entries].sort((a, b) => b.data.runTimestamp.localeCompare(a.data.runTimestamp));
}

export function sortIdeasTopRatedFirst(entries: CollectionEntry<'ideas'>[]): CollectionEntry<'ideas'>[] {
  return [...entries].sort((a, b) => {
    const ratingDelta = b.data.rating.overall - a.data.rating.overall;
    if (ratingDelta !== 0) return ratingDelta;
    return b.data.runTimestamp.localeCompare(a.data.runTimestamp);
  });
}

export function sectorSlugFor(value: string | null | undefined): string {
  return String(value ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

export function formatSectorLabel(value: string | null | undefined, lang: Lang = 'en'): string {
  const raw = String(value ?? '').trim();
  if (!raw) return lang === 'zh' ? '未知' : 'Unknown';
  if (lang === 'zh') return localizeSector(raw, lang);
  return raw
    .split(/([\s-]+)/)
    .map((part) => /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join('');
}

export interface ReportSectorGroup {
  slug: string;
  sector: string;
  label: string;
  entries: CollectionEntry<'ideas'>[];
}

export function groupIdeasBySector(entries: CollectionEntry<'ideas'>[], lang: Lang = 'en'): ReportSectorGroup[] {
  const groups = new Map<string, { sector: string; entries: CollectionEntry<'ideas'>[] }>();
  for (const entry of sortIdeasNewestFirst(entries)) {
    const sector = String(entry.data.sector ?? 'unknown');
    const slug = sectorSlugFor(sector);
    const existing = groups.get(slug) ?? { sector, entries: [] };
    existing.entries.push(entry);
    groups.set(slug, existing);
  }
  return [...groups.entries()]
    .map(([slug, group]) => ({
      slug,
      sector: group.sector,
      label: formatSectorLabel(group.sector, lang),
      entries: group.entries,
    }))
    .sort((a, b) => b.entries.length - a.entries.length || a.label.localeCompare(b.label));
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

export interface ReportCollectionSummary {
  averageRating: number | null;
  sectorCount: number;
  topSector: { sector: string; label: string; count: number } | null;
  topEntry: CollectionEntry<'ideas'> | null;
}

export function summarizeReportEntries(entries: CollectionEntry<'ideas'>[], lang: Lang = 'en'): ReportCollectionSummary {
  if (entries.length === 0) {
    return { averageRating: null, sectorCount: 0, topSector: null, topEntry: null };
  }

  const ratingSum = entries.reduce((sum, entry) => sum + entry.data.rating.overall, 0);
  const sectors = new Map<string, { sector: string; count: number }>();
  for (const entry of entries) {
    const sector = String(entry.data.sector ?? 'unknown');
    const slug = sectorSlugFor(sector);
    const existing = sectors.get(slug) ?? { sector, count: 0 };
    existing.count += 1;
    sectors.set(slug, existing);
  }

  const [topSector] = [...sectors.values()].sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));

  return {
    averageRating: ratingSum / entries.length,
    sectorCount: sectors.size,
    topSector: topSector ? { ...topSector, label: formatSectorLabel(topSector.sector, lang) } : null,
    topEntry: sortIdeasTopRatedFirst(entries)[0] ?? null,
  };
}

function dimensionScore(entry: CollectionEntry<'ideas'>, key: 'market' | 'differentiation' | 'execution' | 'timeliness'): number {
  return entry.data.rating.dimensions[key]?.score ?? 0;
}

export function findRelatedDossiers(
  currentEntry: CollectionEntry<'ideas'>,
  entries: CollectionEntry<'ideas'>[],
  limit = RELATED_DOSSIER_LIMIT,
): CollectionEntry<'ideas'>[] {
  const currentSectorSlug = sectorSlugFor(currentEntry.data.sector);
  return entries
    .filter((entry) => entry.id !== currentEntry.id)
    .map((entry) => {
      const sameSectorBoost = sectorSlugFor(entry.data.sector) === currentSectorSlug ? 100 : 0;
      const ratingFit = entry.data.rating.overall * 8;
      const dimensionFit = (['market', 'differentiation', 'execution', 'timeliness'] as const).reduce((score, key) => {
        return score + Math.max(0, 5 - Math.abs(dimensionScore(currentEntry, key) - dimensionScore(entry, key)));
      }, 0);
      return { entry, score: sameSectorBoost + ratingFit + dimensionFit };
    })
    .sort((a, b) => b.score - a.score || b.entry.data.runTimestamp.localeCompare(a.entry.data.runTimestamp))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
