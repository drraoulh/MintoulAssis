import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const paths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'] }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/assistant', priority: 0.95, changeFrequency: 'weekly' },
    { path: '/explorer', priority: 0.9, changeFrequency: 'daily' },
    { path: '/destinations', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/planifier', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/vision', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/mon-voyage', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/wishlist', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/culture', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/hotels', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/decouvrir', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/booking', priority: 0.6, changeFrequency: 'monthly' },
  ];

  const now = new Date();
  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
