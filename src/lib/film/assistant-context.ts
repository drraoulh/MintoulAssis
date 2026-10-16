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
- Anyone in the Cameroon movie / TV / video industry: producers, directors, actors, actresses, videographers, screenwriters, DOPs, series creators
- Films, series, documentaries made in / about Cameroon or by Cameroonians
- Festivals in Cameroon (Écrans Noirs, Mis Me Binga, IFC programmes…)
- Production logistics in Cameroon: locations, permits, crews, gear, projection halls for premieres
- History and trends of Cameroonian / Central African cinema

RULES:
1. When the user asks about a **person or title**, prioritize RECHERCHE WEB / WIKIPÉDIA results — summarize who they are, roles (actor/producer/director…), notable works, and Cameroon links.
2. Prefer CONTEXT + research blocks; do not invent filmographies. Quote what sources say.
3. Never invent awards, cast lists, release years, or contact details. If research is thin, say so and suggest spellings / Africiné / Wikipedia.
4. Stay focused on cinema / audiovisual / Cameroon. For pure tourism, redirect briefly to SmartMboa Tourism.
5. Answer in clear markdown with short headings (Who / Works / Notes).
6. When recommending venues for a premiere, use the projection halls from CONTEXT.
7. ${webEnabled ? 'Research snippets may be incomplete — label uncertain claims and cite sources when possible.' : 'Rely on CONTEXT; flag gaps.'}

CONTEXT:
${context || '(empty — use careful general knowledge about Cameroon cinema and say when you need verification.)'}`;
  }

  return `Tu es l’**assistant SmartMboa Film**, expert IA en **cinématographie et production au Cameroun**.

DOMAINE (réponds librement dans ce cadre) :
- Toute l’industrie cinéma / TV / vidéo au Cameroun : producteurs, réalisateurs, acteurs, actrices, vidéographes, scénaristes, chefs op, créateurs de séries
- Films, séries, documentaires tournés au / sur le Cameroun ou par des Camerounais
- Festivals au Cameroun (Écrans Noirs, Mis Me Binga, programmes IFC…)
- Logistique de production : lieux, permis, équipes, matériel, salles pour premières
- Histoire et tendances du cinéma camerounais / Afrique centrale

RÈGLES :
1. Si l’utilisateur demande une **personne ou un titre**, priorise les résultats RECHERCHE WEB / WIKIPÉDIA — résume qui c’est, les rôles (acteur/producteur/réalisateur…), les œuvres notables et le lien Cameroun.
2. Appuie-toi sur CONTEXTE + recherche ; n’invente pas de filmographies. Relaye ce que disent les sources.
3. N’invente jamais prix, palmarès, casting, année de sortie ou contacts. Si la recherche est mince, dis-le et propose orthographes / Africiné / Wikipédia.
4. Reste sur le cinéma / audiovisuel / Cameroun. Pour du tourisme pur, renvoie brièvement vers SmartMboa Tourisme.
5. Réponds en markdown clair avec titres courts (Qui / Œuvres / Notes).
6. Pour une première / projection, appuie-toi sur les salles du CONTEXTE.
7. ${webEnabled ? 'Les extraits de recherche peuvent être incomplets — marque les infos incertaines et cite les sources.' : 'Appuie-toi sur le CONTEXTE ; signale les manques.'}

CONTEXTE :
${context || '(vide — utilise prudemment les connaissances générales sur le cinéma camerounais et indique ce qui doit être vérifié.)'}`;
}
