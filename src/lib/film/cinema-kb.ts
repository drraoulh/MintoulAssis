/**
 * Curated Cameroon cinematography knowledge for the Film AI assistant.
 * Used as grounded context; the agent also web-searches for fresher facts.
 */

export type CinemaKbKind =
  | 'filmmaker'
  | 'actor'
  | 'producer'
  | 'film'
  | 'festival'
  | 'institution'
  | 'topic';

export interface CinemaKbEntry {
  id: string;
  kind: CinemaKbKind;
  name: string;
  nameAlt?: string[];
  summaryFr: string;
  summaryEn: string;
  /** Related names for retrieval (films, people, places). */
  related?: string[];
  years?: string;
  city?: string;
}

/**
 * Well-known public Cameroon cinema landmarks — not exhaustive.
 * Prefer web search for filmographies, awards, and current projects.
 */
export const CAMEROON_CINEMA_KB: CinemaKbEntry[] = [
  {
    id: 'dikongue-pipa',
    kind: 'filmmaker',
    name: 'Jean-Pierre Dikongué Pipa',
    summaryFr:
      'Réalisateur pionnier du cinéma camerounais. Son film Muna Moto (1975) est une œuvre majeure du cinéma africain (mariage forcé, tradition / modernité).',
    summaryEn:
      'Pioneer Cameroonian filmmaker. His film Muna Moto (1975) is a landmark of African cinema (forced marriage, tradition vs modernity).',
    related: ['Muna Moto', 'cinéma camerounais'],
    years: 'années 1970–',
  },
  {
    id: 'muna-moto',
    kind: 'film',
    name: 'Muna Moto',
    summaryFr:
      'Long métrage de Jean-Pierre Dikongué Pipa (1975), souvent cité comme un classique du cinéma camerounais et africain.',
    summaryEn:
      'Feature by Jean-Pierre Dikongué Pipa (1975), often cited as a classic of Cameroonian and African cinema.',
    related: ['Jean-Pierre Dikongué Pipa'],
    years: '1975',
  },
  {
    id: 'therese-sita-bella',
    kind: 'filmmaker',
    name: 'Thérèse Sita-Bella',
    nameAlt: ['Therese Sita Bella'],
    summaryFr:
      'Figure pionnière du cinéma africain / camerounais, journaliste et réalisatrice (documentaire Tam-Tam à Paris, années 1960).',
    summaryEn:
      'Pioneer of African / Cameroonian cinema, journalist and director (documentary Tam-Tam à Paris, 1960s).',
    related: ['Tam-Tam à Paris'],
    years: 'années 1960',
  },
  {
    id: 'bassek-ba-kobhio',
    kind: 'filmmaker',
    name: 'Bassek ba Kobhio',
    summaryFr:
      'Réalisateur et producteur camerounais (Sango Malo, Le Grand Blanc de Lambaréné). Actif aussi dans la structuration du cinéma en Afrique centrale.',
    summaryEn:
      'Cameroonian director and producer (Sango Malo, Le Grand Blanc de Lambaréné). Also active in structuring cinema in Central Africa.',
    related: ['Sango Malo', 'Écrans Noirs'],
  },
  {
    id: 'jean-marie-teno',
    kind: 'filmmaker',
    name: 'Jean-Marie Teno',
    summaryFr:
      'Réalisateur de documentaires engagés (Afrique, je te plumerai, Chef !, Le malentendu colonial). Voix majeure du cinéma camerounais contemporain.',
    summaryEn:
      'Director of engaged documentaries (Afrique, je te plumerai, Chef!, Le malentendu colonial). A major voice in contemporary Cameroonian cinema.',
    related: ['Afrique je te plumerai', 'documentaire camerounais'],
  },
  {
    id: 'jean-pierre-bekolo',
    kind: 'filmmaker',
    name: 'Jean-Pierre Bekolo',
    summaryFr:
      'Réalisateur expérimental / fiction (Quartier Mozart, Aristotle’s Plot, Les Saignantes). Style inventif, souvent commenté dans le cinéma africain contemporain.',
    summaryEn:
      'Experimental / fiction director (Quartier Mozart, Aristotle’s Plot, Les Saignantes). Inventive style often discussed in contemporary African cinema.',
    related: ['Quartier Mozart', 'Les Saignantes', "Aristotle's Plot"],
  },
  {
    id: 'quartier-mozart',
    kind: 'film',
    name: 'Quartier Mozart',
    summaryFr: 'Film de Jean-Pierre Bekolo (début des années 1990), satire urbaine à Yaoundé.',
    summaryEn: 'Film by Jean-Pierre Bekolo (early 1990s), urban satire set in Yaoundé.',
    related: ['Jean-Pierre Bekolo', 'Yaoundé'],
    years: '1992',
    city: 'Yaoundé',
  },
  {
    id: 'les-saignantes',
    kind: 'film',
    name: 'Les Saignantes',
    summaryFr:
      'Film de Jean-Pierre Bekolo (2005), fiction speculative / politique souvent citée dans le cinéma africain de genre.',
    summaryEn:
      'Film by Jean-Pierre Bekolo (2005), speculative / political fiction often cited in African genre cinema.',
    related: ['Jean-Pierre Bekolo'],
    years: '2005',
  },
  {
    id: 'josephine-ndagnou',
    kind: 'filmmaker',
    name: 'Joséphine Ndagnou',
    nameAlt: ['Josephine Ndagnou'],
    summaryFr:
      'Réalisatrice camerounaise (Paris à tout prix). Active dans la fiction populaire et la production.',
    summaryEn:
      'Cameroonian director (Paris à tout prix). Active in popular fiction and production.',
    related: ['Paris à tout prix'],
  },
  {
    id: 'paris-a-tout-prix',
    kind: 'film',
    name: 'Paris à tout prix',
    summaryFr: 'Comédie de Joséphine Ndagnou (2013), succès populaire du cinéma camerounais / diaspora.',
    summaryEn: 'Comedy by Joséphine Ndagnou (2013), popular success of Cameroonian / diaspora cinema.',
    related: ['Joséphine Ndagnou'],
    years: '2013',
  },
  {
    id: 'francoise-ellong',
    kind: 'filmmaker',
    name: 'Françoise Ellong',
    summaryFr:
      'Réalisatrice et scénariste camerounaise (W.A.K.A., documentaires et fictions). Présente sur le circuit festivals.',
    summaryEn:
      'Cameroonian director and screenwriter (W.A.K.A., documentaries and fiction). Present on the festival circuit.',
    related: ['W.A.K.A.'],
  },
  {
    id: 'narcisse-wandji',
    kind: 'filmmaker',
    name: 'Narcisse Wandji',
    summaryFr:
      'Réalisateur / producteur camerounais actif dans la fiction et la structuration de projets (à vérifier selon projets récents).',
    summaryEn:
      'Cameroonian director / producer active in fiction and project structuring (verify against recent projects).',
  },
  {
    id: 'alphonse-beni',
    kind: 'filmmaker',
    name: 'Alphonse Beni',
    summaryFr:
      'Acteur et réalisateur camerounais lié au cinéma populaire et aux productions locales des décennies précédentes.',
    summaryEn:
      'Cameroonian actor and director linked to popular cinema and local productions of earlier decades.',
  },
  {
    id: 'ecrans-noirs',
    kind: 'festival',
    name: 'Écrans Noirs',
    nameAlt: ['Ecrans Noirs'],
    summaryFr:
      'Festival panafricain de cinéma basé à Yaoundé — compétitions, masterclasses, networking Afrique centrale. Site : ecransnoirs.org.',
    summaryEn:
      'Pan-African film festival based in Yaoundé — competitions, masterclasses, Central Africa networking. Site: ecransnoirs.org.',
    related: ['Yaoundé', 'Bassek ba Kobhio'],
    city: 'Yaoundé',
  },
  {
    id: 'mis-me-binga',
    kind: 'festival',
    name: 'Mis Me Binga',
    summaryFr: 'Festival international de films de femmes à Yaoundé.',
    summaryEn: 'International women’s film festival in Yaoundé.',
    city: 'Yaoundé',
  },
  {
    id: 'ifc-cinema',
    kind: 'institution',
    name: 'Institut français du Cameroun — cinéma',
    nameAlt: ['IFC', 'Institut français'],
    summaryFr:
      'Antennes Yaoundé et Douala : projections, débats, ateliers et accueils de premières / festivals.',
    summaryEn:
      'Yaoundé and Douala branches: screenings, talks, workshops, and premiere / festival hosting.',
    related: ['Yaoundé', 'Douala'],
    city: 'Yaoundé / Douala',
  },
  {
    id: 'topic-cinema-cm',
    kind: 'topic',
    name: 'Cinéma camerounais',
    summaryFr:
      'Le cinéma camerounais mélange fiction, documentaire et productions populaires (Nollywood-influencées ou locales). Les festivals (Écrans Noirs, Mis Me Binga) et les Instituts français structurent une partie de la circulation. Pour un nom précis (acteur, producteur, film), croiser sources web fiables.',
    summaryEn:
      'Cameroonian cinema mixes fiction, documentary, and popular productions (Nollywood-influenced or local). Festivals (Écrans Noirs, Mis Me Binga) and French Institutes structure part of the circuit. For a specific name (actor, producer, film), cross-check reliable web sources.',
    related: ['Écrans Noirs', 'production', 'Yaoundé', 'Douala'],
  },
  {
    id: 'topic-production-cm',
    kind: 'topic',
    name: 'Tourner / produire au Cameroun',
    summaryFr:
      'Production au Cameroun : autorisations, fixers, lieux (côte, savane, villes), matériel local, salles de projection pour premières (Majestic, Eden, Genesis, IFC). SmartMboa Film aide sur lieux, procédures, salles et événements.',
    summaryEn:
      'Producing in Cameroon: permits, fixers, locations (coast, savanna, cities), local gear, projection halls for premieres (Majestic, Eden, Genesis, IFC). SmartMboa Film helps with locations, procedures, halls, and events.',
    related: ['fixer', 'lieux de tournage', 'salles de projection'],
  },
];

export function searchCinemaKb(query: string, limit = 8): CinemaKbEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CAMEROON_CINEMA_KB.filter((e) => e.kind === 'topic').slice(0, 2);

  const tokens = q
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const scored = CAMEROON_CINEMA_KB.map((e) => {
    const hay = `${e.name} ${(e.nameAlt || []).join(' ')} ${e.summaryFr} ${e.summaryEn} ${(e.related || []).join(' ')} ${e.city || ''}`.toLowerCase();
    let score = 0;
    if (hay.includes(q)) score += 10;
    for (const t of tokens) {
      if (e.name.toLowerCase().includes(t)) score += 6;
      if ((e.nameAlt || []).some((a) => a.toLowerCase().includes(t))) score += 5;
      if ((e.related || []).some((r) => r.toLowerCase().includes(t))) score += 4;
      if (hay.includes(t)) score += 2;
    }
    if (/festival|écrans|ecrans|mis me binga/i.test(q) && e.kind === 'festival') score += 3;
    if (/film|movie|long[-\s]?m[eé]trage/i.test(q) && e.kind === 'film') score += 2;
    if (/acteur|actrice|actor|actrice|réalisat|director|producteur|producer/i.test(q) &&
      (e.kind === 'filmmaker' || e.kind === 'actor' || e.kind === 'producer')) {
      score += 2;
    }
    return { e, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) return scored.slice(0, limit).map((x) => x.e);

  // Always give topical anchors for open cinema questions
  return CAMEROON_CINEMA_KB.filter((e) => e.kind === 'topic' || e.kind === 'festival').slice(
    0,
    4,
  );
}

export function formatCinemaKbForPrompt(entries: CinemaKbEntry[], locale: 'fr' | 'en'): string {
  if (!entries.length) return '';
  return entries
    .map((e, i) => {
      const summary = locale === 'fr' ? e.summaryFr : e.summaryEn;
      const rel = e.related?.length ? ` | Lié: ${e.related.join(', ')}` : '';
      const years = e.years ? ` (${e.years})` : '';
      const city = e.city ? ` — ${e.city}` : '';
      return `${i + 1}. [${e.kind}] ${e.name}${years}${city}\n   ${summary}${rel}`;
    })
    .join('\n');
}
