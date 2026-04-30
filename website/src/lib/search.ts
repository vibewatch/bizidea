import type { CollectionEntry } from 'astro:content';
import { loadLocalizedIndex } from '../content/ideas-loader';
import { localizeSector, type Lang } from './i18n';

export interface SearchDocument {
  id: string;
  href: string;
  title: string;
  topic: string;
  kicker: string;
  sector: string;
  sectorLabel: string;
  rating: number;
  runTimestamp: string;
  date: string;
  searchText: string;
}

function localizedText(entry: CollectionEntry<'ideas'>, lang: Lang, field: 'kicker' | 'pitch' | 'topic'): string {
  const localized = loadLocalizedIndex(entry.id, lang);
  const value = localized?.[field];
  return typeof value === 'string' && value.length > 0 ? value : entry.data[field];
}

export function buildSearchDocuments(entries: CollectionEntry<'ideas'>[], lang: Lang, base: string): SearchDocument[] {
  const prefix = lang === 'zh' ? `${base}zh/` : base;
  return entries.map((entry) => {
    const title = localizedText(entry, lang, 'pitch');
    const topic = localizedText(entry, lang, 'topic');
    const kicker = localizedText(entry, lang, 'kicker');
    const sector = String(entry.data.sector ?? '');
    const sectorLabel = localizeSector(sector, lang);
    const searchText = [title, topic, kicker, sector, sectorLabel, entry.data.date, entry.data.runTimestamp]
      .join(' ')
      .toLowerCase();
    return {
      id: entry.id,
      href: `${prefix}${entry.data.folderSlug}/`,
      title,
      topic,
      kicker,
      sector,
      sectorLabel,
      rating: entry.data.rating.overall,
      runTimestamp: entry.data.runTimestamp,
      date: entry.data.date,
      searchText,
    };
  });
}