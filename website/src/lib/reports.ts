import type { CollectionEntry } from 'astro:content';

export const HOMEPAGE_REPORT_LIMIT = 15;

export function sortIdeasNewestFirst(entries: CollectionEntry<'ideas'>[]): CollectionEntry<'ideas'>[] {
  return [...entries].sort((a, b) => b.data.runTimestamp.localeCompare(a.data.runTimestamp));
}
