import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { ideaFeedItems } from '../../lib/rss';

export async function GET(context: APIContext) {
  const ideas = await getCollection('ideas');
  const siteRoot = context.site ?? new URL('https://bizidea.genisisiq.com');
  const site = new URL(`${import.meta.env.BASE_URL}zh/`, siteRoot);

  return rss({
    title: 'BizIdea',
    description: 'AI 生成的创业研究报告：筛选、创意、市场、计划、财务模型。',
    site,
    items: ideaFeedItems(ideas, 'zh', import.meta.env.BASE_URL),
    customData: '<language>zh-cn</language>',
  });
}
