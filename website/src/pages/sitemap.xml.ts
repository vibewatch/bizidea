import { getCollection } from 'astro:content';
import { hasZhTranslation } from '../content/ideas-loader';
import { groupIdeasByMonth, groupIdeasBySector, sortIdeasNewestFirst } from '../lib/reports';

interface SitemapRoute {
  path: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}

const xmlEscape = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export async function GET(context: { site?: URL }) {
  const site = context.site?.toString() ?? 'https://bizidea.genisisiq.com';
  const base = import.meta.env.BASE_URL;
  const all = sortIdeasNewestFirst(await getCollection('ideas'));
  const zh = all.filter((entry) => hasZhTranslation(entry.id));
  const latestDate = all[0]?.data.date;

  const routes: SitemapRoute[] = [
    { path: '', priority: '1.0', changefreq: 'daily', lastmod: latestDate },
    { path: 'zh/', priority: '0.9', changefreq: 'daily', lastmod: zh[0]?.data.date ?? latestDate },
    { path: 'archive/', priority: '0.8', changefreq: 'daily', lastmod: latestDate },
    { path: 'zh/archive/', priority: '0.7', changefreq: 'daily', lastmod: zh[0]?.data.date ?? latestDate },
    { path: 'sectors/', priority: '0.7', changefreq: 'weekly', lastmod: latestDate },
    { path: 'zh/sectors/', priority: '0.6', changefreq: 'weekly', lastmod: zh[0]?.data.date ?? latestDate },
    { path: 'top-rated/', priority: '0.7', changefreq: 'weekly', lastmod: latestDate },
    { path: 'zh/top-rated/', priority: '0.6', changefreq: 'weekly', lastmod: zh[0]?.data.date ?? latestDate },
    { path: 'search/', priority: '0.6', changefreq: 'weekly', lastmod: latestDate },
    { path: 'zh/search/', priority: '0.5', changefreq: 'weekly', lastmod: zh[0]?.data.date ?? latestDate },
    ...groupIdeasByMonth(all, 'en').map((month) => ({
      path: `archive/${month.slug}/`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: month.entries[0]?.data.date,
    })),
    ...groupIdeasByMonth(zh, 'zh').map((month) => ({
      path: `zh/archive/${month.slug}/`,
      priority: '0.5',
      changefreq: 'monthly',
      lastmod: month.entries[0]?.data.date,
    })),
    ...groupIdeasBySector(all, 'en').map((sector) => ({
      path: `sectors/${sector.slug}/`,
      priority: '0.6',
      changefreq: 'weekly',
      lastmod: sector.entries[0]?.data.date,
    })),
    ...groupIdeasBySector(zh, 'zh').map((sector) => ({
      path: `zh/sectors/${sector.slug}/`,
      priority: '0.5',
      changefreq: 'weekly',
      lastmod: sector.entries[0]?.data.date,
    })),
    ...all.map((entry) => ({
      path: `${entry.data.folderSlug}/`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: entry.data.date,
    })),
    ...zh.map((entry) => ({
      path: `zh/${entry.data.folderSlug}/`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: entry.data.date,
    })),
  ];

  const seen = new Set<string>();
  const urlFor = (path: string) => {
    const pathname = `${base}${path}`.replace(/\/+/g, '/');
    return new URL(pathname, site).toString();
  };
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .filter((route) => {
      const url = urlFor(route.path);
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((route) => {
      const lastmod = route.lastmod ? `\n    <lastmod>${xmlEscape(route.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${xmlEscape(urlFor(route.path))}</loc>${lastmod}\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
    })
    .join('\n')}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}