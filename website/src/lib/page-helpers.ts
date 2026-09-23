import type { CollectionEntry } from 'astro:content';
import { loadLocalizedIndex, type LocalizedIndexData } from '../content/ideas-loader';
import { localizeSector, type Lang } from './i18n';

export type IdeaEntry = CollectionEntry<'ideas'>;
export type LocalizedTextField = 'kicker' | 'pitch' | 'topic';
export type LocalizedIndexMap = Map<string, LocalizedIndexData | null>;

export function formatRunTimestamp(ts: string): string {
  if (!/^\d{14}$/.test(ts)) return ts;
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}`;
}

export function languagePrefix(base: string, lang: Lang): string {
  return lang === 'zh' ? `${base}zh/` : base;
}

export function dossierHref(entry: IdeaEntry, lang: Lang, base: string): string {
  return `${languagePrefix(base, lang)}${entry.data.folderSlug}/`;
}

export function buildLocalizedIndexMap(entries: IdeaEntry[], lang: Lang): LocalizedIndexMap {
  const localized = new Map<string, LocalizedIndexData | null>();
  for (const entry of entries) {
    localized.set(entry.id, loadLocalizedIndex(entry.id, lang));
  }
  return localized;
}

export function localizedText(
  entry: IdeaEntry,
  localized: LocalizedIndexMap,
  field: LocalizedTextField,
): string {
  const value = localized.get(entry.id)?.[field];
  return typeof value === 'string' && value.length > 0 ? value : entry.data[field];
}

export function localizedSector(entry: IdeaEntry, lang: Lang): string {
  const raw = String(entry.data.sector ?? '');
  return lang === 'zh' ? localizeSector(raw, lang) : raw;
}
