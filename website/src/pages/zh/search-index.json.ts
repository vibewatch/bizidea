import { getCollection } from 'astro:content';
import { hasZhTranslation } from '../../content/ideas-loader';
import { buildSearchDocuments } from '../../lib/search';
import { sortIdeasNewestFirst } from '../../lib/reports';

export async function GET() {
  const entries = sortIdeasNewestFirst((await getCollection('ideas')).filter((entry) => hasZhTranslation(entry.id)));
  const body = JSON.stringify(buildSearchDocuments(entries, 'zh', import.meta.env.BASE_URL));
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}