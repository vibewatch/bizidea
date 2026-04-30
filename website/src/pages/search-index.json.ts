import { getCollection } from 'astro:content';
import { buildSearchDocuments } from '../lib/search';
import { sortIdeasNewestFirst } from '../lib/reports';

export async function GET() {
  const entries = sortIdeasNewestFirst(await getCollection('ideas'));
  const body = JSON.stringify(buildSearchDocuments(entries, 'en', import.meta.env.BASE_URL));
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}