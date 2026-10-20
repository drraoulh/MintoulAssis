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
    id: 'ebenezer-kepombia',
    kind: 'filmmaker',
    name: 'Ebenezer Kepombia',
    nameAlt: ['Mitoumba', 'Ebenzer Kepombia', 'Ebenezer Kepombi'],
    summaryFr:
      'Acteur, réalisateur, scénariste et producteur camerounais (né le 19 mai 1970 à Bazou), alias Mitoumba. Enseignant d’allemand de formation ; carrière artistique dès 2000. Courts métrages : Le Sac d’ignames, Le Masochiste, Triste Saint Valentin. Premier long métrage : Le Conjoint d’autrui (2005). Séries (année — titre — rôle) : 2007 Foyer polygamique (Mitoumba) ; 2012 Ennemis intimes (Mitoumba) ; 2013 La Belle-mère ; 2013 Cercle vicieux (officier Ondoa, producteur, Canal 2 International dès 2014) ; 2016 La Reine blanche (Notable Mitoumba, réalisation) ; 2018 Habiba (Messanga) ; 2019 Otages d’amour (commissaire Ondoa, réalisation) ; 2020 Roses écarlates (production, réalisée par Frank Olivier Ndema) ; 2020 Madame… Monsieur (Papa Loko, réalisation) ; 2023 La Bataille des chéries (commandant Dialo, réalisation, Canal+ / CINAF) ; 2025 Révélations scandaleuses (Papa Lucas, réalisation). Joue aussi dans Ma grande famille (série ivoirienne). Distinction aux LFC Awards (2020).',
    summaryEn:
      'Cameroonian actor, director, screenwriter and producer (born 19 May 1970 in Bazou), aka Mitoumba. Trained as a German teacher; artistic career from 2000. Short films: Le Sac d’ignames, Le Masochiste, Triste Saint Valentin. First feature: Le Conjoint d’autrui (2005). Series (year — title — role): 2007 Foyer polygamique (Mitoumba); 2012 Ennemis intimes (Mitoumba); 2013 La Belle-mère; 2013 Cercle vicieux (officer Ondoa, producer, Canal 2 International from 2014); 2016 La Reine blanche (Notable Mitoumba, director); 2018 Habiba (Messanga); 2019 Otages d’amour (Commissioner Ondoa, director); 2020 Roses écarlates (producer, directed by Frank Olivier Ndema); 2020 Madame… Monsieur (Papa Loko, director); 2023 La Bataille des chéries (Commander Dialo, director, Canal+ / CINAF); 2025 Révélations scandaleuses (Papa Lucas, director). Also appears in Ma grande famille (Ivorian series). LFC Awards distinction (2020).',
    related: [
      'Mitoumba',
      'Foyer polygamique',
      'Madame Monsieur',
      'La Reine blanche',
      'La Bataille des chéries',
      'Habiba',
      'Cercle vicieux',
      'Les Déballeurs',
      'Canal 2',
    ],
    years: '1970–',
    city: 'Douala / Cameroun',
  },
  {
    id: 'brenda-elung',
    kind: 'producer',
    name: 'Brenda Elung',
    nameAlt: ['Elung Brenda'],
    summaryFr:
      'Productrice et actrice camerounaise, figure de l’industrie (Cameroon Film Industry / CFI). Connue notamment pour la série Samba et un rôle structurant côté production populaire.',
    summaryEn:
      'Cameroonian producer and actress, industry figure (Cameroon Film Industry / CFI). Known especially for the Samba series and a structuring role in popular production.',
    related: ['Samba', 'CFI', 'Cameroon Film Industry'],
  },
  {
    id: 'syndy-emade',
    kind: 'producer',
    name: 'Syndy Emade',
    summaryFr:
      'Actrice, productrice et entrepreneure camerounaise (fiction / films populaires). Présente aussi comme face publique de l’industrie.',
    summaryEn:
      'Cameroonian actress, producer and entrepreneur (fiction / popular films). Also a public face of the industry.',
    related: ['production camerounaise'],
  },
  {
    id: 'enah-johnscott',
    kind: 'filmmaker',
    name: 'Enah Johnscott',
    summaryFr:
      'Réalisateur / producteur camerounais actif dans la fiction contemporaine et le cinéma populaire anglophone / bilingue.',
    summaryEn:
      'Cameroonian director / producer active in contemporary fiction and popular Anglophone / bilingual cinema.',
  },
  {
    id: 'nkanya-nkwai',
    kind: 'producer',
    name: 'Nkanya Nkwai',
    summaryFr:
      'Acteur et producteur camerounais (ex. Nightfall / Tombée de la nuit), actif entre productions locales et collaborations internationales.',
    summaryEn:
      'Cameroonian actor and producer (e.g. Nightfall / Tombée de la nuit), active between local productions and international collaborations.',
    related: ['Nightfall'],
  },
  {
    id: 'epule-jeffrey',
    kind: 'actor',
    name: 'Epule Jeffrey',
    nameAlt: ['Jeffrey Epule', 'Epule Jeffery'],
    summaryFr:
      'Acteur camerounais très présent dans les séries et films populaires (souvent cité aux côtés de productions CFI / Nollywood-influencées).',
    summaryEn:
      'Cameroonian actor widely present in popular series and films (often cited alongside CFI / Nollywood-influenced productions).',
  },
  {
    id: 'muriel-blanche',
    kind: 'actor',
    name: 'Muriel Blanche',
    summaryFr:
      'Actrice camerounaise connue pour des rôles dans des séries populaires (dont des productions liées à Ebenezer Kepombia / Mitoumba).',
    summaryEn:
      'Cameroonian actress known for roles in popular series (including productions linked to Ebenezer Kepombia / Mitoumba).',
    related: ['Madame Monsieur', 'Ebenezer Kepombia'],
  },
  {
    id: 'axel-abessolo',
    kind: 'actor',
    name: 'Axel Abessolo',
    summaryFr:
      'Acteur camerounais présent dans des séries TV (Madame… Monsieur, La Bataille des chéries, etc.).',
    summaryEn:
      'Cameroonian actor present in TV series (Madame… Monsieur, La Bataille des chéries, etc.).',
    related: ['Madame Monsieur', 'Ebenezer Kepombia'],
  },
  {
    id: 'eriq-ebouaney',
    kind: 'actor',
    name: 'Eriq Ebouaney',
    summaryFr:
      'Acteur franco-camerounais international (cinéma européen et africain), référence de la diaspora camerounaise à l’écran.',
    summaryEn:
      'Franco-Cameroonian international actor (European and African cinema), a reference of the Cameroonian diaspora on screen.',
  },
  {
    id: 'solange-yijika',
    kind: 'actor',
    name: 'Solange Yijika',
    summaryFr: 'Actrice et productrice camerounaise active dans la fiction populaire.',
    summaryEn: 'Cameroonian actress and producer active in popular fiction.',
  },
  {
    id: 'daniel-kamwa',
    kind: 'filmmaker',
    name: 'Daniel Kamwa',
    summaryFr:
      'Réalisateur camerounais classique (Pousse-Pousse, et autres fictions populaires des décennies précédentes).',
    summaryEn:
      'Classic Cameroonian director (Pousse-Pousse, and other popular fiction from earlier decades).',
    related: ['Pousse-Pousse'],
  },
  {
    id: 'emy-dany-bassong',
    kind: 'actor',
    name: 'Emy Dany Bassong',
    nameAlt: ['Émilienne Danielle Ngo Bassong'],
    summaryFr:
      'Actrice camerounaise (séries et films) ; présente dans des productions liées au cinéma / télé populaire camerounais.',
    summaryEn:
      'Cameroonian actress (series and films); present in productions linked to popular Cameroonian cinema / TV.',
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

const KB_STOP = new Set(
  'a an the do you know who is what about me tell qui est ce que des les une un du de la le pour avec dans sur and or of in to for on please peux tu parler connais'.split(
    ' ',
  ),
);

export function searchCinemaKb(query: string, limit = 8): CinemaKbEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CAMEROON_CINEMA_KB.filter((e) => e.kind === 'topic').slice(0, 2);

  const tokens = q
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3 && !KB_STOP.has(t));

  // Proper-name bias: if user typed capitalized words, require those to match when possible
  const nameHints = [
    ...query.matchAll(
      /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+){0,3})\b/gu,
    ),
  ].map((m) => m[1].toLowerCase());

  const scored = CAMEROON_CINEMA_KB.map((e) => {
    const nameHay = `${e.name} ${(e.nameAlt || []).join(' ')}`.toLowerCase();
    const hay = `${nameHay} ${e.summaryFr} ${e.summaryEn} ${(e.related || []).join(' ')} ${e.city || ''}`.toLowerCase();
    let score = 0;
    if (nameHay.includes(q) || hay.includes(q)) score += 12;
    for (const hint of nameHints) {
      if (hint.length >= 4 && nameHay.includes(hint)) score += 14;
    }
    for (const t of tokens) {
      if (nameHay.includes(t)) score += 8;
      else if ((e.related || []).some((r) => r.toLowerCase().includes(t))) score += 4;
      else if (hay.includes(t)) score += 1;
    }
    if (/festival|écrans|ecrans|mis me binga/i.test(q) && e.kind === 'festival') score += 3;
    if (/film|movie|long[-\s]?m[eé]trage/i.test(q) && e.kind === 'film') score += 2;
    if (
      /acteur|actrice|actor|réalisat|director|producteur|producer|vidéographe|videographer/i.test(
        q,
      ) &&
      (e.kind === 'filmmaker' || e.kind === 'actor' || e.kind === 'producer')
    ) {
      score += 2;
    }
    return { e, score };
  })
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score);

  if (scored.length) return scored.slice(0, limit).map((x) => x.e);

  // Named person/film query with no KB hit — return empty so web research leads
  if (nameHints.some((h) => h.split(' ').length >= 2) || tokens.length <= 3) {
    return [];
  }

  return CAMEROON_CINEMA_KB.filter((e) => e.kind === 'topic' || e.kind === 'festival').slice(
    0,
    3,
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
