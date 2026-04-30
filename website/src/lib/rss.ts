import type { CollectionEntry } from 'astro:content';
import { hasZhTranslation, loadLocalizedIndex } from '../content/ideas-loader';
import type { Lang } from './i18n';

type IdeaEntry = CollectionEntry<'ideas'>;

export function sortIdeasNewestFirst(entries: IdeaEntry[]): IdeaEntry[] {
  return [...entries].sort((a, b) => b.data.runTimestamp.localeCompare(a.data.runTimestamp));
}

export function filterFeedEntries(entries: IdeaEntry[], lang: Lang): IdeaEntry[] {
  if (lang === 'zh') return entries.filter((entry) => hasZhTranslation(entry.id));
  return entries;
}

function localizedText(entry: IdeaEntry, lang: Lang, field: 'kicker' | 'pitch' | 'topic'): string {
  if (lang === 'zh') {
    const localized = loadLocalizedIndex(entry.id, lang);
    const value = localized?.[field];
    if (typeof value === 'string' && value.length > 0) return value;
  }

  return entry.data[field];
}

function pubDateFor(entry: IdeaEntry): Date {
  const timestamp = entry.data.runTimestamp;
  if (/^\d{14}$/.test(timestamp)) {
    return new Date(Date.UTC(
      Number(timestamp.slice(0, 4)),
      Number(timestamp.slice(4, 6)) - 1,
      Number(timestamp.slice(6, 8)),
      Number(timestamp.slice(8, 10)),
      Number(timestamp.slice(10, 12)),
      Number(timestamp.slice(12, 14)),
    ));
  }

  return new Date(`${entry.data.date}T00:00:00Z`);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function ideaFeedItems(entries: IdeaEntry[], lang: Lang, base: string) {
  return filterFeedEntries(sortIdeasNewestFirst(entries), lang).map((entry) => {
    const prefix = lang === 'zh' ? `${base}zh/` : base;
    const title = localizedText(entry, lang, 'pitch');
    const topic = localizedText(entry, lang, 'topic');

    return {
      title,
      pubDate: pubDateFor(entry),
      description: topic,
      link: `${prefix}${entry.data.folderSlug}/`,
      customData: `<category>${escapeXml(entry.data.sector)}</category>`,
    };
  });
}
