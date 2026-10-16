import { searchCinemaKb, formatCinemaKbForPrompt } from '@/lib/film/cinema-kb';
import { FILM_DIRECTORY } from '@/lib/film/directory';
import { PROJECTION_HALLS } from '@/lib/film/halls';
import { FILM_RESOURCES } from '@/lib/film/resources';
import { CURATED_CINEMA_EVENTS } from '@/lib/film/events';
import { FILM_LOCATIONS } from '@/lib/film/locations';

export function buildFilmAssistantContext(userText: string, locale: 'fr' | 'en'): string {
  const kb = searchCinemaKb(userText, 8);
  const kbBlock = formatCinemaKbForPrompt(kb, locale);

  const q = userText.toLowerCase();
  const dirHits = FILM_DIRECTORY.filter((d) => {
    const hay = `${d.name} ${d.specialtyFr} ${d.specialtyEn} ${d.cityFr}`.toLowerCase();
    return q.split(/\s+/).some((t) => t.length > 2 && hay.includes(t));
  }).slice(0, 5);

  const hallHits = PROJECTION_HALLS.filter((h) => {
    const hay = `${h.name} ${h.city} ${h.descriptionFr}`.toLowerCase();
    return (
      /salle|cin[eé]ma|premi[eè]re|projection|hall|eden|majestic|genesis|institut/i.test(q) ||
      q.split(/\s+/).some((t) => t.length > 2 && hay.includes(t))
    );
  }).slice(0, 4);

  const resHits = FILM_RESOURCES.filter((r) => {
    const hay = `${r.titleFr} ${r.titleEn} ${r.bodyFr}`.toLowerCase();
    return (
      /festival|appel|formation|financ|funding|bourse/i.test(q) ||
      q.split(/\s+/).some((t) => t.length > 2 && hay.includes(t))
    );
  }).slice(0, 4);

  const locHits = FILM_LOCATIONS.filter((l) => {
    const hay = `${l.nameFr} ${l.nameEn} ${l.cityFr} ${l.regionId}`.toLowerCase();
    return (
      /lieu|tournage|location|shoot|plage|chefferie|parc/i.test(q) ||
      q.split(/\s+/).some((t) => t.length > 2 && hay.includes(t))
    );
  }).slice(0, 4);

  const parts: string[] = [];

  if (kbBlock) {
    parts.push(
      locale === 'fr'
        ? `BASE CINÉMA CAMEROUNAIS (référence, à croiser avec le web si besoin) :\n${kbBlock}`
        : `CAMEROON CINEMA BASE (reference — cross-check web when needed):\n${kbBlock}`,
    );
  }

  if (dirHits.length) {
    parts.push(
      `ANNUAIRE PRODUCTION (indicatif) :\n${dirHits
        .map(
          (d) =>
            `• ${d.name} [${d.category}] — ${locale === 'fr' ? d.cityFr : d.cityEn} — ${
              locale === 'fr' ? d.specialtyFr : d.specialtyEn
            }`,
        )
        .join('\n')}`,
    );
  }

  if (hallHits.length) {
    parts.push(
      `SALLES DE PROJECTION :\n${hallHits
        .map(
          (h) =>
            `• ${h.name} — ${h.city} — ${locale === 'fr' ? h.addressFr : h.addressEn}`,
        )
        .join('\n')}`,
    );
  }

  if (resHits.length) {
    parts.push(
      `RESSOURCES / FESTIVALS :\n${resHits
        .map(
          (r) =>
            `• ${locale === 'fr' ? r.titleFr : r.titleEn} — ${
              locale === 'fr' ? r.bodyFr : r.bodyEn
            }${r.url ? ` (${r.url})` : ''}`,
        )
        .join('\n')}`,
    );
  }

  if (locHits.length) {
    parts.push(
      `LIEUX DE TOURNAGE (catalogue SmartMboa) :\n${locHits
        .map(
          (l) =>
            `• ${locale === 'fr' ? l.nameFr : l.nameEn} — ${
              locale === 'fr' ? l.cityFr : l.cityEn
            }`,
        )
        .join('\n')}`,
    );
  }

  const fest = CURATED_CINEMA_EVENTS.slice(0, 3)
    .map((e) => `• ${e.titleFr || e.title} — ${e.city}`)
    .join('\n');
  if (fest) {
    parts.push(`ÉVÉNEMENTS / FESTIVALS (référence) :\n${fest}`);
  }

  return parts.join('\n\n');
}

export function buildFilmSystemPrompt(
  locale: 'fr' | 'en',
  context: string,
  webEnabled: boolean,
): string {
  if (locale === 'en') {
    return `You are **SmartMboa Film Assistant**, an expert AI for **Cameroon cinematography and film production**.

DOMAIN (answer freely within this scope):
- Cameroonian filmmakers, directors, producers, actors, actresses
- Films, series, documentaries made in / about Cameroon or by Cameroonians
- Festivals in Cameroon (Écrans Noirs, Mis Me Binga, IFC programmes…)
- Production logistics in Cameroon: locations, permits, crews, gear, projection halls for premieres
- History and trends of Cameroonian / Central African cinema

RULES:
1. Prefer the CONTEXT blocks below when relevant; enrich with web results when provided.
2. For specific people or film titles not clearly in CONTEXT, use WEB results carefully — say what is known vs uncertain.
3. Never invent awards, cast lists, release years, or contact details. If unsure, say so and suggest how to verify.
4. Stay focused on cinema / audiovisual / Cameroon. For pure tourism, redirect briefly to SmartMboa Tourism.
5. Answer in clear markdown. Structure with short headings when helpful.
6. When recommending venues for a premiere, use the projection halls from CONTEXT.
7. ${webEnabled ? 'Web snippets are unverified — label uncertain claims.' : 'No live web this turn — rely on CONTEXT and general established knowledge; flag gaps.'}

CONTEXT:
${context || '(empty — use careful general knowledge about Cameroon cinema and say when you need verification.)'}`;
  }

  return `Tu es l’**assistant SmartMboa Film**, expert IA en **cinématographie et production au Cameroun**.

DOMAINE (réponds librement dans ce cadre) :
- Cinéastes, réalisateurs, producteurs, acteurs et actrices camerounais
- Films, séries, documentaires tournés au / sur le Cameroun ou par des Camerounais
- Festivals au Cameroun (Écrans Noirs, Mis Me Binga, programmes IFC…)
- Logistique de production : lieux, permis, équipes, matériel, salles pour premières
- Histoire et tendances du cinéma camerounais / Afrique centrale

RÈGLES :
1. Priorise les blocs CONTEXTE ci-dessous ; enrichis avec le web s’il est fourni.
2. Pour un nom précis (personne / film) absent du CONTEXTE, utilise le WEB avec prudence — distingue le certain de l’incertain.
3. N’invente jamais prix, palmarès, casting, année de sortie ou contacts. En cas de doute, dis-le et indique comment vérifier.
4. Reste sur le cinéma / audiovisuel / Cameroun. Pour du tourisme pur, renvoie brièvement vers SmartMboa Tourisme.
5. Réponds en markdown clair. Titres courts si utile.
6. Pour une première / projection, appuie-toi sur les salles du CONTEXTE.
7. ${webEnabled ? 'Les extraits web ne sont pas vérifiés — marque les infos incertaines.' : 'Pas de web pour ce tour — appuie-toi sur le CONTEXTE et les connaissances établies ; signale les manques.'}

CONTEXTE :
${context || '(vide — utilise prudemment les connaissances générales sur le cinéma camerounais et indique ce qui doit être vérifié.)'}`;
}
