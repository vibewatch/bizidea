import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { ideaFeedItems } from '../lib/rss';

export async function GET(context: APIContext) {
  const ideas = await getCollection('ideas');
  const site = context.site ?? new URL('https://bizidea.genisisiq.com');

  return rss({
    title: 'BizIdea',
    description: 'AI-generated startup research dossiers — triage, idea, market, plan, financial model.',
    site,
    items: ideaFeedItems(ideas, 'en', import.meta.env.BASE_URL),
    customData: '<language>en-us</language>',
  });
}
