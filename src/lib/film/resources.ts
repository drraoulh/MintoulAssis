import type { FilmResource, ResourceKind } from '@/lib/film/types';

/** Verified-only training, festivals, funding, and public calls. */
export const FILM_RESOURCES: FilmResource[] = [
  {
    id: 'ecrans-noirs',
    kind: 'festival',
    titleFr: 'Écrans Noirs',
    titleEn: 'Écrans Noirs',
    bodyFr:
      'Festival panafricain basé à Yaoundé — sélection, masterclasses et networking pour cinéastes d’Afrique centrale.',
    bodyEn:
      'Pan-African festival based in Yaoundé — selection, masterclasses, and networking for Central African filmmakers.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    verified: true,
    periodFr: 'Annuel',
    periodEn: 'Annual',
    url: 'https://www.ecransnoirs.org',
  },
  {
    id: 'mis-me-binga',
    kind: 'festival',
    titleFr: 'Mis Me Binga',
    titleEn: 'Mis Me Binga',
    bodyFr: 'Festival international de films de femmes — Yaoundé.',
    bodyEn: 'International women’s film festival — Yaoundé.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    verified: true,
    periodFr: 'Annuel',
    periodEn: 'Annual',
  },
  {
    id: 'institut-francais-cinema',
    kind: 'training',
    titleFr: 'Ateliers cinéma — Institut français',
    titleEn: 'Cinema workshops — Institut français',
    bodyFr:
      'Formations et projections régulièrement annoncées via les Instituts français (Yaoundé / Douala). Vérifier le calendrier local.',
    bodyEn:
      'Training and screenings regularly announced via French Institutes (Yaoundé / Douala). Check the local calendar.',
    cityFr: 'Yaoundé / Douala',
    cityEn: 'Yaoundé / Douala',
    verified: true,
  },
  {
    id: 'minaculture-calls',
    kind: 'call',
    titleFr: 'Appels publics culture / audiovisuel',
    titleEn: 'Public culture / audiovisual calls',
    bodyFr:
      'Les appels à projets du Ministère des Arts et de la Culture et des partenaires publics sont publiés ponctuellement — surveiller les canaux officiels.',
    bodyEn:
      'Calls from the Ministry of Arts and Culture and public partners are published periodically — monitor official channels.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    verified: true,
  },
  {
    id: 'acp-eu-culture',
    kind: 'funding',
    titleFr: 'Programmes ACP–UE Culture (historique / partenaires)',
    titleEn: 'ACP–EU Culture programmes (legacy / partners)',
    bodyFr:
      'Financements régionaux pour la création audiovisuelle ont existé via des fenêtres ACP–UE ; vérifier les appels actifs auprès des points focaux culture.',
    bodyEn:
      'Regional audiovisual creation funding has existed via ACP–EU windows; check active calls with culture focal points.',
    cityFr: 'Régional',
    cityEn: 'Regional',
    verified: true,
  },
  {
    id: 'goa-fund',
    kind: 'funding',
    titleFr: 'Fonds et bourses cinéma (veille)',
    titleEn: 'Cinema funds & scholarships (watchlist)',
    bodyFr:
      'Bourses francophones et panafricaines (écriture, développement) circulent chaque année — SmartMboa n’affiche que des pistes vérifiées, pas des montants inventés.',
    bodyEn:
      'Francophone and pan-African grants (writing, development) circulate yearly — SmartMboa only lists verified pathways, never invented amounts.',
    cityFr: 'International',
    cityEn: 'International',
    verified: true,
  },
];

export function filterResources(opts: {
  kind?: ResourceKind | 'all';
  q?: string;
}): FilmResource[] {
  const q = opts.q?.trim().toLowerCase();
  return FILM_RESOURCES.filter((r) => {
    if (!r.verified) return false;
    if (opts.kind && opts.kind !== 'all' && r.kind !== opts.kind) return false;
    if (q) {
      const hay = `${r.titleFr} ${r.titleEn} ${r.bodyFr} ${r.bodyEn}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const RESOURCE_KINDS: { id: ResourceKind; fr: string; en: string }[] = [
  { id: 'training', fr: 'Formation', en: 'Training' },
  { id: 'festival', fr: 'Festivals', en: 'Festivals' },
  { id: 'funding', fr: 'Financement', en: 'Funding' },
  { id: 'call', fr: 'Appels publics', en: 'Public calls' },
];
