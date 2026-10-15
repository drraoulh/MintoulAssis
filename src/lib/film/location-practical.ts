import type { AccessLevel, CostTier } from '@/lib/film/types';

/** Practical filters layered on shared location records. */
export const LOCATION_PRACTICAL: Record<
  string,
  { costTier: CostTier; accessLevel: AccessLevel }
> = {
  'chutes-de-la-lobe': { costTier: 'moderate', accessLevel: 'easy' },
  'kribi-plages': { costTier: 'budget', accessLevel: 'easy' },
  'mont-cameroun': { costTier: 'premium', accessLevel: 'demanding' },
  'down-beach-limbe': { costTier: 'budget', accessLevel: 'easy' },
  'jardin-botanique-limbe': { costTier: 'budget', accessLevel: 'easy' },
  'parc-waza': { costTier: 'premium', accessLevel: 'demanding' },
  rhumsiki: { costTier: 'moderate', accessLevel: 'moderate' },
  'palais-royal-foumban': { costTier: 'moderate', accessLevel: 'easy' },
  'chefferie-bandjoun': { costTier: 'budget', accessLevel: 'easy' },
  'monument-reunification-yaounde': { costTier: 'budget', accessLevel: 'easy' },
  'parc-dja': { costTier: 'premium', accessLevel: 'demanding' },
  'lac-barombi-mbo': { costTier: 'moderate', accessLevel: 'moderate' },
};

export function practicalFor(slug: string): {
  costTier: CostTier;
  accessLevel: AccessLevel;
} {
  return LOCATION_PRACTICAL[slug] ?? { costTier: 'moderate', accessLevel: 'moderate' };
}
