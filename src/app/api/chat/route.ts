import { randomUUID } from "node:crypto";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getPlaces, searchPlacesForGuide } from "@/lib/places";
import { prepareAiMarkdown } from "@/lib/markdown/sanitize-ai-markdown";
import {
  buildTourismWebQuery,
  formatWebHitsForPrompt,
  searchWeb,
  webHitsToCitations,
  webSearchEnvEnabled,
} from "@/lib/web-search";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Gemini 2.5 Flash defaults to ~65535 max output when max_tokens is omitted
 * via OpenRouter — that exceeds typical credit budgets. Cap output explicitly.
 */
const CHAT_MAX_OUTPUT_TOKENS = 5_000;

type Incoming = {
  message?: string;
  messages?: { role: string; content: string }[];
  conversation_id?: string;
  locale?: string;
};

type UrlCitationAnnotation = {
  type?: string;
  url_citation?: {
    url?: string;
    title?: string;
    content?: string;
  };
};

function looksLikeItineraryRequest(text: string): boolean {
  return /itin[eé]raire|itinerary|jours?\s+(à|a|in|au)|budget|voyageurs?|travelers?|séjour|sejour|planifier|programme\s+de\s+voyage|r[eé]servation/i.test(
    text,
  );
}

/** Short greetings / chitchat — must NOT dump random KB places. */
function looksLikeGreetingOrChitchat(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length > 120) return false;
  if (
    looksLikeItineraryRequest(t) ||
    looksLikeTourismWebTopic(t) ||
    looksLikeParksOrNatureQuery(t) ||
    looksLikeFactualTourismQuery(t)
  ) {
    return false;
  }

  // Pure greeting tokens
  if (
    /^(bonjour|bonsoir|salut|hello|hi|hey|coucou|hola|good\s*(morning|afternoon|evening)|merci|thanks|thank\s*you|ok|okay|d'?accord|à\s+bientôt|au\s+revoir|bye)([\s,!.?;:]*)?$/i.test(
      t,
    )
  ) {
    return true;
  }

  // "Bonjour, assistant vocal" / "Hi SmartMboa"
  if (
    /^(bonjour|bonsoir|salut|hello|hi|hey)[\s,;:]+(l'?assistant|assistant(\s+vocal)?|guide|smartmboa)([\s,!.?;:]*)?$/i.test(
      t,
    )
  ) {
    return true;
  }

  // "Assistant vocal" alone
  if (/^(l'?assistant(\s+vocal)?|assistant\s+vocal|smartmboa)([\s,!.?;:]*)?$/i.test(t)) {
    return true;
  }

  return false;
}

function greetingReply(locale: string): string {
  if (locale === "en") {
    return `Hello! I'm the **SmartMboa** travel guide for Cameroon.

I can help with destinations, national parks, beaches, city tips, and trip outlines.

Tell me a city (Kribi, Limbe, Yaoundé…) or what you like (nature, beach, culture), and we'll start.`;
  }
  return `Bonjour ! Je suis le guide **SmartMboa** pour le Cameroun.

Je peux vous aider pour les destinations, parcs nationaux, plages, idées de séjour et conseils pratiques.

Dites-moi une ville (Kribi, Limbé, Yaoundé…) ou ce que vous aimez (nature, plage, culture), et on commence.`;
}

/**
 * Tourism topics where OpenRouter web search can add real value when KB is thin
 * or when the user asks for verifiable practical facts (prices, hours, access).
 */
function looksLikeTourismWebTopic(text: string): boolean {
  return /parc|parcs|r[eé]serve|r[eé]serves|national|naturel|naturels|wildlife|safari|site[s]?\s+touristique|tourist\s+site|monument|mus[eé]e|waterfall|chute[s]?|volcan|montagne|beach|plage|destination|visiter|visite[rz]?|que\s+faire|what\s+to\s+do|week[\s-]?end|activit[eé]|activit[eé]s|excursion|h[eé]bergement|h[oô]tel|auberge|lodge|appart|r[eé]sidence|lodging|restaurant|resto|gastronomie|cuisine|manger|o[uù]\s+manger|where\s+to\s+eat|march[eé]|shopping|bar|nightlife|transport|bus|taxi|ferry|horaires?|hours?|ouvert|opening|tarif|tarifs|prix|price|prices?|entr[eé]e|admission|fees?|acc[eè]s|access|comment\s+y\s+aller|how\s+to\s+get|trouve[rz]?|find\s+me|recommande|recommend|limbe|limb[eé]|yaound[eé]|douala|kribi|bafoussam|maroua|garoua|b[eé]nou[eé]|waza|korup|campo|dja/i.test(
    text,
  );
}

function looksLikeRestaurantQuery(text: string): boolean {
  return /restaurant|resto|gastronomie|cuisine|manger|o[uù]\s+manger|where\s+to\s+eat|repas|food|street\s*food|maquis/i.test(
    text,
  );
}

function looksLikeActivityQuery(text: string): boolean {
  return /que\s+faire|what\s+to\s+do|activit[eé]|excursion|visite[rz]?|visiter|week[\s-]?end|sortie|nightlife|bar\b|plage|beach|mus[eé]e|monument/i.test(
    text,
  );
}

function looksLikeFactualTourismQuery(text: string): boolean {
  return /tarif|tarifs|prix|price|prices?|entr[eé]e|admission|fees?|horaires?|hours?|ouvert|opening|acc[eè]s|access|comment\s+y\s+aller|how\s+to\s+get/i.test(
    text,
  );
}

function looksLikeParksOrNatureQuery(text: string): boolean {
  return /parc|parcs|r[eé]serve|r[eé]serves|national\s+park|naturel|naturels|wildlife|safari|biodiversit/i.test(
    text,
  );
}

function extractSpecificParkHint(text: string): string | null {
  const patterns: { re: RegExp; label: string }[] = [
    { re: /b[eé]nou[eé]|benoue/i, label: "Bénoué" },
    { re: /\bwaza\b/i, label: "Waza" },
    { re: /\bkorup\b/i, label: "Korup" },
    { re: /campo\s*ma'?an|campo/i, label: "Campo" },
    { re: /\bdja\b/i, label: "Dja" },
    { re: /\bfaro\b/i, label: "Faro" },
    { re: /bouba\s*ndjidda|ndjidda/i, label: "Bouba Ndjidda" },
    { re: /lob[eé]k[eé]/i, label: "Lobéké" },
  ];
  for (const p of patterns) {
    if (p.re.test(text)) return p.label;
  }
  return null;
}

type GuidePlace = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  city?: string | null;
  short_description?: string | null;
  description?: string | null;
  kb_text?: string | null;
  source_url?: string | null;
  price_from?: number | null;
  lat?: number | null;
  lng?: number | null;
};

/** Lighter blob for relevance scoring — kb_text is too noisy (mentions "parc"/"hôtel" everywhere). */
function placeFocusBlob(p: GuidePlace): string {
  return [p.name, p.city, p.short_description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isNaturePlace(p: GuidePlace): boolean {
  const name = (p.name || "").toLowerCase();
  const focus = placeFocusBlob(p);
  // Name-first: national parks / reserves / botanical gardens / wildlife centres.
  if (
    /parc\s+national|national\s+park|jardin\s+botanique|wildlife|centre\s+de\s+faune|r[eé]serve\s+(naturelle|de\s+faune|de\s+biosph)|biosphere/i.test(
      name,
    )
  ) {
    return true;
  }
  if (
    /\b(waza|korup|bouba\s+ndjidda|b[eé]nou[eé]|benoue|lob[eé]k[eé]|campo\s+ma'?an|\bdja\b|\bfaro\b)/i.test(
      name,
    )
  ) {
    return true;
  }
  // Allow "Parc de X" in the name only (not free-text kb mentions of "parc").
  if (/^parc\b|\bpark\b/i.test(name) && !/parking|stationnement/i.test(name)) {
    return true;
  }
  // Short description may confirm a named reserve without polluting from kb_text.
  return /parc\s+national|national\s+park|r[eé]serve\s+(naturelle|de\s+faune)/i.test(focus);
}

function isLodgingPlace(p: GuidePlace): boolean {
  const cat = (p.category || "").toLowerCase();
  if (/hotel|h[oô]tel|heberg|héberg|lodg|auberge|appart|resort/i.test(cat)) return true;
  const focus = `${p.name || ""} ${placeFocusBlob(p)}`;
  return /h[oô]tel|hotel|auberge|lodge|r[eé]sidence|appart|motel|\binn\b|guest\s*house|campement/i.test(
    focus,
  );
}

function isTouristInterestPlace(p: GuidePlace): boolean {
  if (isNaturePlace(p) || isLodgingPlace(p)) return true;
  const focus = placeFocusBlob(p);
  return /mus[eé]e|monument|cath[eé]drale|basilique|plage|beach|lac\b|mont\b|volcan|cascade|chute\s+d|zoo|wildlife|jardin\s+botanique|site\s+tour|touristique|falls|waterfall|palace|palais|ch[uû]teau/i.test(
    focus,
  );
}

const CITY_PATTERNS: { re: RegExp; needle: string }[] = [
  { re: /yaound[eé]/i, needle: "Yaoundé" },
  { re: /\bdouala\b/i, needle: "Douala" },
  { re: /limb[eé]/i, needle: "Limbé" },
  { re: /\bkribi\b/i, needle: "Kribi" },
  { re: /bafoussam/i, needle: "Bafoussam" },
  { re: /\bmaroua\b/i, needle: "Maroua" },
  { re: /\bgaroua\b/i, needle: "Garoua" },
  { re: /\bbuea\b/i, needle: "Buea" },
  { re: /\bbamenda\b/i, needle: "Bamenda" },
  { re: /ngaound[eé]r[eé]/i, needle: "Ngaoundéré" },
];

/** Realistic day-trip / short-stay surroundings per hub (lowercase needles). */
const DESTINATION_NEARBY: Record<string, string[]> = {
  Kribi: [
    "kribi",
    "campo",
    "lobé",
    "lobe",
    "grand batanga",
    "londji",
    "ébodjé",
    "ebodje",
    "lokoundjé",
    "lokoundje",
    "lolodorf",
    "edéa",
    "edea",
  ],
  Douala: ["douala", "youpwe", "bonanjo", "akwa", "deido", "edéa", "edea", "limbe", "limbé"],
  "Limbé": ["limbé", "limbe", "buea", "douala", "idénau", "idenau", "bakingili"],
  "Yaoundé": ["yaoundé", "yaounde", "mbalmayo", "soa", "nsimalen"],
  Bafoussam: ["bafoussam", "dschang", "foumban", "bana", "bangangté", "bangangte"],
  Maroua: ["maroua", "waza", "rhumsiki", "mokolo", "kousseri"],
  Garoua: ["garoua", "bénoué", "benoue", "lagdo"],
  Buea: ["buea", "limbé", "limbe", "mount cameroon", "mont cameroun"],
  Bamenda: ["bamenda", "bafut", "fundong"],
  "Ngaoundéré": ["ngaoundéré", "ngaoundere", "tibati"],
};

/** Far-north / distant parks that must never appear on a southern coastal trip. */
const DISTANT_FROM_SOUTH_COAST =
  /bouba\s*ndjidda|ndjidda|\bwaza\b|maroua|garoua|b[eé]nou[eé]|benoue|\bfaro\b|lob[eé]k[eé]|rhumsiki|mokolo|kousseri|ngaound[eé]r[eé]/i;

function normalizeLoc(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractCameroonCity(text: string): string | null {
  for (const c of CITY_PATTERNS) {
    if (c.re.test(text)) return c.needle;
  }
  return null;
}

function placeMatchesCity(p: GuidePlace, city: string): boolean {
  const n = normalizeLoc(city);
  const loc = normalizeLoc([p.city, p.name].filter(Boolean).join(" "));
  return loc.includes(n);
}

function placeInDestinationArea(p: GuidePlace, city: string): boolean {
  if (placeMatchesCity(p, city)) return true;
  const needles = DESTINATION_NEARBY[city] ?? [city.toLowerCase()];
  const loc = normalizeLoc([p.city, p.name, p.short_description].filter(Boolean).join(" "));
  return needles.some((n) => loc.includes(normalizeLoc(n)));
}

function isDistantForDestination(p: GuidePlace, city: string): boolean {
  if (placeInDestinationArea(p, city)) return false;
  const southCoast = /kribi|limb[eé]|douala|ed[eé]a|campo|buea/i;
  if (southCoast.test(city) && DISTANT_FROM_SOUTH_COAST.test(`${p.name || ""} ${p.city || ""}`)) {
    return true;
  }
  // Another major city hub far from the requested one
  for (const c of CITY_PATTERNS) {
    if (c.needle === city) continue;
    if (c.re.test(`${p.city || ""}`) && !placeInDestinationArea(p, city)) {
      // Allow if listed as nearby for this destination
      const nearby = DESTINATION_NEARBY[city] ?? [];
      if (nearby.some((n) => normalizeLoc(c.needle).includes(normalizeLoc(n)) || normalizeLoc(n).includes(normalizeLoc(c.needle)))) {
        continue;
      }
      return true;
    }
  }
  return false;
}

function wantsLodgingHelp(text: string): boolean {
  return /h[eé]bergement|lodging|h[oô]tel|auberge|lodge|r[eé]sidence|appart|où\s+dormir|ou\s+dormir|where\s+to\s+stay|accommodation|r[eé]server?\s+un\s+h[eé]berg|book\s+(a\s+)?(hotel|lodg)|trouve[rz]?\s+(moi\s+)?(un\s+)?h[oô]tel|find\s+(me\s+)?(a\s+)?hotel/i.test(
    text,
  );
}

function looksLikeLodgingQuery(text: string): boolean {
  return wantsLodgingHelp(text);
}

function extractTripCalendarDays(text: string): number {
  const cal = text.match(/(\d+)\s+jours?\s+calendaires/i);
  if (cal) return Math.min(30, Math.max(1, parseInt(cal[1], 10)));
  const nights = text.match(/(\d+)\s+nuits?/i);
  if (nights) return Math.min(30, Math.max(1, parseInt(nights[1], 10) + 1));
  const stay = text.match(/(?:rester|stay|séjour(?:ner)?\s+de|sejour(?:ner)?\s+de)\s+(\d+)\s+jours?/i);
  if (stay) return Math.min(30, Math.max(1, parseInt(stay[1], 10)));
  const plain = text.match(/(\d+)\s+jours?\s+(?:à|a|in|au|en)\b/i);
  if (plain) return Math.min(30, Math.max(1, parseInt(plain[1], 10)));
  return 3;
}

/** Best-effort inclusive date labels from planner / user prompts. */
function extractTripDateLabels(text: string): { start: string; end: string } | null {
  const fr = text.match(
    /du\s+(\d{1,2}\s+\w+\s+\d{4})\s+au\s+(\d{1,2}\s+\w+\s+\d{4})/i,
  );
  if (fr) return { start: fr[1].trim(), end: fr[2].trim() };
  const en = text.match(
    /from\s+(\d{1,2}\s+\w+\s+\d{4})\s+to\s+(\d{1,2}\s+\w+\s+\d{4})/i,
  );
  if (en) return { start: en[1].trim(), end: en[2].trim() };
  const iso = text.match(/(\d{4}-\d{2}-\d{2}).{0,40}(\d{4}-\d{2}-\d{2})/);
  if (iso) return { start: iso[1], end: iso[2] };
  return null;
}

function truncateForPrompt(text: string | null | undefined, maxLen: number): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLen) return cleaned;
  const slice = cleaned.slice(0, maxLen);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  if (sentenceEnd >= Math.floor(maxLen * 0.45)) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const wordEnd = slice.lastIndexOf(" ");
  return `${(wordEnd > 40 ? slice.slice(0, wordEnd) : slice).trim()}…`;
}

function placeRelevanceForTrip(
  p: GuidePlace,
  city: string | null,
  locale: string,
): string | null {
  if (!city) return null;
  if (!placeInDestinationArea(p, city)) return null;
  const fr = locale !== "en";
  const name = (p.name || "").toLowerCase();
  if (/h[oô]tel|auberge|lodge|résidence|residence|campement/i.test(name)) {
    return fr
      ? `Pertinence : hébergement possible à / près de ${city}.`
      : `Relevance: lodging option in / near ${city}.`;
  }
  if (/plage|beach|lob[eé]|chute|cascade|parc|mus[eé]e|monument/i.test(name)) {
    return fr
      ? `Pertinence : site à intégrer dans un séjour à ${city}.`
      : `Relevance: site to include in a ${city} stay.`;
  }
  return fr
    ? `Pertinence : lieu local pour un séjour à ${city}.`
    : `Relevance: local place for a ${city} trip.`;
}

function countRelevantKbHits(places: GuidePlace[], query: string): number {
  const city = extractCameroonCity(query);
  if (looksLikeLodgingQuery(query)) {
    const lodging = places.filter(isLodgingPlace);
    if (city) {
      return lodging.filter((p) => placeInDestinationArea(p, city)).length;
    }
    return lodging.length;
  }
  if (looksLikeRestaurantQuery(query)) {
    const food = places.filter((p) => {
      const blob = `${p.category || ""} ${placeFocusBlob(p)}`;
      return /restaurant|resto|cuisine|gastronom|maquis|food|bar\b/i.test(blob);
    });
    if (city) {
      return food.filter((p) => placeInDestinationArea(p, city)).length;
    }
    return food.length;
  }
  if (city) {
    return places.filter(
      (p) => placeInDestinationArea(p, city) && isTouristInterestPlace(p),
    ).length;
  }
  if (looksLikeParksOrNatureQuery(query)) {
    return places.filter(isNaturePlace).length;
  }
  return places.filter(isTouristInterestPlace).length;
}

/**
 * KB is "thin" for this ask â†’ enable web fill.
 * City-scoped: count only hits in / near that city (hotel in Douala â‰  hotel in Yaoundé).
 */
function isKbInsufficientForQuery(places: GuidePlace[], query: string): boolean {
  if (!places.length) return true;
  // Factual questions (prices/hours/access) often need web even if a place is listed.
  if (looksLikeFactualTourismQuery(query)) return true;
  const relevant = countRelevantKbHits(places, query);
  // Nothing on-topic in the requested city / topic â†’ must search the web.
  if (relevant === 0) return true;
  // Lodging / restaurants: fewer than 2 verified options in area â†’ web complement.
  if (looksLikeLodgingQuery(query) || looksLikeRestaurantQuery(query)) {
    return relevant < 2;
  }
  // Parks / city guides / activities need several on-topic hits.
  if (
    looksLikeParksOrNatureQuery(query) ||
    looksLikeActivityQuery(query) ||
    extractCameroonCity(query)
  ) {
    return relevant < 3;
  }
  return relevant < 2;
}

function mergePlacesById(
  primary: GuidePlace[],
  extra: GuidePlace[],
  limit: number,
): GuidePlace[] {
  const seen = new Set<string>();
  const out: GuidePlace[] = [];
  for (const p of [...primary, ...extra]) {
    const key = p.id || p.name || "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

function prioritizeRelevantPlaces(places: GuidePlace[], query: string): GuidePlace[] {
  const city = extractCameroonCity(query);
  if (looksLikeLodgingQuery(query)) {
    const lodging = places.filter(isLodgingPlace);
    const other = places.filter((p) => !isLodgingPlace(p));
    if (city) {
      const inArea = lodging.filter((p) => placeInDestinationArea(p, city));
      const restLodging = lodging.filter((p) => !placeInDestinationArea(p, city));
      return [...inArea, ...restLodging, ...other];
    }
    return [...lodging, ...other];
  }
  if (city) {
    const inArea = places.filter((p) => placeInDestinationArea(p, city));
    const other = places.filter(
      (p) => !placeInDestinationArea(p, city) && !isDistantForDestination(p, city),
    );
    return [...inArea, ...other];
  }
  if (looksLikeParksOrNatureQuery(query)) {
    const nature = places.filter(isNaturePlace);
    const other = places.filter((p) => !isNaturePlace(p));
    return [...nature, ...other];
  }
  return places;
}


function sanitizeProviderError(raw: string): string {
  return raw
    .replace(/sk-or-v1-[a-zA-Z0-9]+/gi, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

function isCreditOrTokenError(status: number, message: string): boolean {
  if (status === 402) return true;
  return /more credits|can only afford|max_tokens|insufficient.?credit|quota|payment.?required/i.test(
    message,
  );
}

/** OpenRouter 402 often reports how many output tokens the key can still afford. */
function parseAffordableMaxTokens(message: string): number | null {
  const m = message.match(/can only afford\s+(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 256) return null;
  // Leave a small margin under the hard afford ceiling.
  return Math.max(512, n - 64);
}

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url.slice(0, 48);
  }
}

function buildSystemPrompt(
  locale: string,
  context: string,
  itinerary: boolean,
  opts: {
    webEnabled: boolean;
    kbCount: number;
    lodgingQuery?: boolean;
    cityHint?: string | null;
  },
): string {
  const fr = locale !== "en";
  const hasKb = opts.kbCount > 0;
  const lodging = !!opts.lodgingQuery;
  const city = opts.cityHint?.trim() || null;
  const webNoteFr = opts.webEnabled
    ? hasKb
      ? `La recherche web OpenRouter est ACTIVÉE : complète / vérifie la KB (existence, localisation, horaires/prix/accès si disponibles)${city ? ` — focus ${city}` : ""}.`
      : `La recherche web OpenRouter est ACTIVÉE car la KB n'a pas (assez) d'options${city ? ` à ${city}` : ""}. UTILISE-LA pour proposer des options concrètes (hôtels, restos, sites…), marquées Â« à confirmer Â». INTERDIT de dire que tu n'as aucune information.`
    : `La recherche web n'est PAS activée pour ce message.`;
  const webNoteEn = opts.webEnabled
    ? hasKb
      ? `OpenRouter web search is ENABLED: complement / verify the KB (existence, location, hours/prices/access when available)${city ? ` — focus ${city}` : ""}.`
      : `OpenRouter web search is ENABLED because the KB has no (or too few) options${city ? ` in ${city}` : ""}. USE IT to propose concrete options (hotels, restaurants, sites…), marked "to confirm". FORBIDDEN to say you have no information.`
    : `Web search is NOT enabled for this message.`;

  const lodgingFr = lodging
    ? `
Hébergement (prioritaire pour cette question) :
- COMMENCE toujours par 2–5 options concrètes (nom, ville/quartier, prix KB s'il existe, pourquoi ça convient) — ne commence PAS par une liste de questions.
- INTERDIT de dire Â« je n'ai pas d'informations sur les hôtels Â» quand le CONTEXTE contient des établissements OU que la recherche web est activée.
- Si aucun hôtel KB${city ? ` à ${city}` : ""} : cherche sur le web des hébergements dans cette ville, marque Â« à confirmer Â».
- Après les options, une courte phrase peut inviter à préciser budget / quartier pour affiner.
- Ne prétends JAMAIS qu'une réservation est confirmée ; oriente vers la page Hébergements / réservation démo SmartMboa si utile.
`
    : "";
  const lodgingEn = lodging
    ? `
Lodging (priority for this question):
- ALWAYS lead with 2–5 concrete options (name, city/area, KB price if any, why it fits) — do NOT start with a preference questionnaire.
- FORBIDDEN to say you have no hotel information when CONTEXT has stays OR web search is enabled.
- If no KB hotel${city ? ` in ${city}` : ""}: web-search stays in that city, mark "to confirm".
- After the options, one short line may invite budget / neighborhood to refine.
- NEVER claim a booking is confirmed; point to SmartMboa Stays / demo booking when useful.
`
    : "";

  const commonFr = `Rédige une réponse naturelle, claire et utile en français (Markdown simple : titres, listes, gras).
Ne mets PAS d'URL ni de liste Â« Sources Â» dans le corps du texte — l'application affiche les sources à part.
Ne prétends jamais qu'une réservation est confirmée : propose seulement des recommandations (le voyageur réserve auprès du prestataire).

Règles de vérité (obligatoires) :
- Priorise la base de connaissances (CONTEXTE) quand elle contient des lieux pertinents : ce sont des infos Â« vérifiées KB Â».
- ${webNoteFr}
- Si la KB est vide pour la ville / le type demandé (hôtel, restaurant, parc, activité…) et que le web est activé : propose des options via le web, clairement marquées Â« à confirmer Â».
- N'invente JAMAIS de faits précis (surtout tarifs, horaires, conditions d'accès). Si tu n'as pas l'info fiable, dis-le clairement et invite à confirmer sur place / auprès des autorités.
- Marque clairement ce qui est à confirmer (ex. Â« à vérifier Â», Â« selon sources web Â»).
- INTERDIT de refuser avec des phrases du type Â« je ne peux pas vous aider Â» ou Â« le contexte fourni ne contient aucune information Â». Même si le CONTEXTE est vide ou insuffisant, aide le voyageur : partage ce qui est fiable, précise ce qui n'a pas pu être vérifié, et demande destination / préférences pour affiner.
- Pour les parcs / réserves : pour chaque suggestion, indique si possible le nom, la localisation, ce qu'on y découvre, les activités, les infos pratiques disponibles, et les précautions d'accès ; distingue Â« vérifié (KB) Â» vs Â« à confirmer Â».
${lodgingFr}`;

  const commonEn = `Write a natural, clear, useful answer in English (simple Markdown: headings, lists, bold).
Do NOT put URLs or a "Sources" list in the body — the app shows sources separately.
Never claim a booking is confirmed: only recommend (the traveler books with the provider).

Truthfulness rules (required):
- Prefer the knowledge base (CONTEXT) when it has relevant places: treat those as "KB-verified".
- ${webNoteEn}
- If the KB is empty for the requested city / type (hotel, restaurant, park, activity…) and web is enabled: propose options via the web, clearly marked "to confirm".
- NEVER invent precise facts (especially prices, hours, access conditions). If you lack reliable info, say so clearly and suggest confirming on site / with authorities.
- Clearly mark uncertain info (e.g. "to confirm", "per web sources").
- FORBIDDEN to refuse with lines like "I cannot help you" or "the provided context contains no information". Even if CONTEXT is empty or thin, help the traveler: share what is reliable, say what could not be verified, and ask for destination / preferences to refine.
- For parks / reserves: for each suggestion, when possible give name, location, what to discover, activities, practical info if available, and access precautions; distinguish "KB-verified" vs "to confirm".
${lodgingEn}`;

  const kbBlockFr = hasKb
    ? `CONTEXTE (base de connaissances — lieux vérifiés SmartMboa) :\n${context}`
    : `CONTEXTE (base de connaissances) : (aucun lieu pertinent trouvé${city ? ` pour ${city}` : ""} — ne refuse pas ; complète via la recherche web si activée, sinon guide le voyageur et demande des précisions.)`;
  const kbBlockEn = hasKb
    ? `CONTEXT (knowledge base — SmartMboa verified places):\n${context}`
    : `CONTEXT (knowledge base): (no relevant places found${city ? ` for ${city}` : ""} — do not refuse; complement via web search if enabled, otherwise guide the traveler and ask for details.)`;

  if (itinerary) {
    return fr
      ? `Tu es le guide SmartMboa / MINTOUL pour le Cameroun.
Produis un itinéraire COMPLET et PERSONNALISÉ (objectif ~900–1600 mots si besoin). Pas de répétitions inutiles.

Structure OBLIGATOIRE :
1) Résumé (2–3 phrases) : destination, durée (jours calendaires / nuits), voyageurs, budget
2) Programme JOUR PAR JOUR avec la date exacte pour CHAQUE jour inclus (du premier au dernier jour inclus — ne saute JAMAIS le dernier jour)
   Format :
   ## Jour k — <date exacte>
   - Matin / Après-midi / Soir : activités concrètes, suggestions de repas, temps de trajet si connu
   - Hébergement de la nuit si l'utilisateur a demandé une aide hébergement (recommandations seulement)
3) Si aide hébergement demandée : propose 2–4 hébergements locaux adaptés au budget/voyageurs ; prix seulement s'ils sont fiables (KB/web) ; liens/infos de contact s'ils existent ; ne prétends JAMAIS qu'une réservation est confirmée
4) Budget estimatif en FCFA : répartis hébergement / transport / activités / repas quand des données existent ; n'invente pas de tarifs précis ; estime seulement si raisonnable et marque Â« indicatif / à confirmer Â» ; si le budget est insuffisant, explique-le et propose des alternatives concrètes. Évite les formules vides du type Â« Information non disponible Â» pour tout.

Règles géographiques (critiques) :
- Reste STRICTEMENT dans la destination demandée et ses environs réalistes (temps de trajet compatible avec la durée et le budget).
- N'inclus PAS de parcs ou villes lointaines (ex. Bouba Ndjidda, Waza, Maroua pour un séjour à Kribi).
- Les fiches lieux sont affichées à part : dans le texte, cite les noms sans recopier les descriptions complètes.

${commonFr}

${kbBlockFr}`
      : `You are the SmartMboa / MINTOUL guide for Cameroon.
Produce a COMPLETE personalized itinerary (~900–1600 words if needed). No useless repetition.

REQUIRED structure:
1) Summary (2–3 sentences): destination, length (calendar days / nights), travelers, budget
2) Day-by-day program with the exact date for EVERY inclusive day (from first to last day — NEVER drop the last day)
   Format:
   ## Day k — <exact date>
   - Morning / Afternoon / Evening: concrete activities, meal suggestions, travel time when known
   - Night lodging if the user asked for lodging help (recommendations only)
3) If lodging help was requested: propose 2–4 local stays suited to budget/travelers; prices only when reliable (KB/web); booking info/links if they exist; NEVER claim a reservation is confirmed
4) Estimated budget in FCFA: split lodging / transport / activities / meals when data exists; never invent precise prices; estimate only when reasonable and mark "indicative / to confirm"; if the budget is insufficient, explain and offer concrete alternatives. Avoid empty "Information unavailable" for everything.

Geographic rules (critical):
- Stay STRICTLY in the requested destination and realistic surroundings (travel time compatible with stay length and budget).
- Do NOT include distant parks or cities (e.g. Bouba Ndjidda, Waza, Maroua on a Kribi trip).
- Place cards are shown separately: name places in the text without copying full place descriptions.

${commonEn}

${kbBlockEn}`;
  }

  return fr
    ? `Tu es le guide SmartMboa / MINTOUL pour le Cameroun. Concret et concis.
${commonFr}

${kbBlockFr}`
    : `You are the SmartMboa / MINTOUL guide for Cameroon. Clear and concise.
${commonEn}

${kbBlockEn}`;
}

function citationsFromAnnotations(
  annotations: UrlCitationAnnotation[] | undefined,
): { title: string; url: string; type: "WEB" }[] {
  if (!Array.isArray(annotations)) return [];
  const out: { title: string; url: string; type: "WEB" }[] = [];
  const seen = new Set<string>();
  for (const a of annotations) {
    if (a?.type && a.type !== "url_citation") continue;
    const url = a?.url_citation?.url?.trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      title: a.url_citation?.title?.trim() || hostnameLabel(url),
      url,
      type: "WEB",
    });
  }
  return out;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Incoming;
  const locale = body.locale === "en" ? "en" : "fr";
  const lastUser =
    body.message?.trim() ||
    [...(body.messages ?? [])].reverse().find((m) => m.role === "user")?.content?.trim();

  if (!lastUser) {
    return NextResponse.json({ detail: "Message vide" }, { status: 400 });
  }

  const conversationId = body.conversation_id || randomUUID();

  // Greetings / chitchat: reply warmly, no KB dump, no "online verification" noise.
  if (looksLikeGreetingOrChitchat(lastUser)) {
    const message = greetingReply(locale);
    return NextResponse.json({
      conversation_id: conversationId,
      role: "assistant",
      message,
      text: message,
      provider: "greeting",
      places: [],
      sources: [],
      ui_sources: [],
    });
  }

  const itineraryMode = looksLikeItineraryRequest(lastUser);
  const lodgingQuery = looksLikeLodgingQuery(lastUser);
  const limit = itineraryMode ? 12 : lodgingQuery ? 10 : 8;
  const cityHint = extractCameroonCity(lastUser);
  const parkHintEarly = extractSpecificParkHint(lastUser);
  // City-scoped trips must NOT pull nationwide parks just because "Nature" is an interest.
  const nationwideParksQuery =
    looksLikeParksOrNatureQuery(lastUser) && !cityHint && !itineraryMode;
  // Help KB retrieval for nature / lodging without changing the search architecture.
  const kbQuery = parkHintEarly
    ? `parc national ${parkHintEarly} ${lastUser}`
    : lodgingQuery && cityHint
      ? `${cityHint} hôtel hotel auberge lodge résidence hébergement`
      : cityHint && (itineraryMode || looksLikeParksOrNatureQuery(lastUser))
        ? `${cityHint} tourisme plage nature culture histoire gastronomie hébergement ${lastUser}`
        : nationwideParksQuery
          ? `${lastUser} parc national réserve Waza Bénoué Korup Campo Ma'an Dja Faro`
          : lastUser;

  let contextPlaces: GuidePlace[] = [];
  try {
    contextPlaces = await searchPlacesForGuide(kbQuery, limit);
    // City-focused follow-up when the broad query returned few on-topic hits.
    if (cityHint && contextPlaces.filter((p) => placeInDestinationArea(p, cityHint)).length < 3) {
      const cityPlaces = await searchPlacesForGuide(cityHint, limit);
      contextPlaces = mergePlacesById(
        contextPlaces.filter((p) => placeInDestinationArea(p, cityHint)),
        cityPlaces,
        limit,
      );
    }
    // Lodging: always pull verified hotels from KB (standalone hotel ask OR itinerary lodging).
    if (lodgingQuery || (itineraryMode && cityHint && wantsLodgingHelp(lastUser))) {
      const lodgingSearch = await searchPlacesForGuide(
        `${cityHint || ""} hôtel hotel auberge lodge résidence appart`.trim(),
        12,
      );
      let lodgingCatalog: GuidePlace[] = [];
      try {
        const rows = await getPlaces({
          city: cityHint || undefined,
          category: "hotels-et-hebergements",
          limit: 12,
        });
        lodgingCatalog = rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          category: r.category,
          city: r.city,
          short_description: r.short_description,
          description: r.description,
          source_url: r.source_url,
          price_from: r.price_from,
          lat: r.lat,
          lng: r.lng,
          kb_text: r.kb_text,
        }));
      } catch (err) {
        console.warn("[chat] lodging catalog lookup failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      const lodgingMerged = mergePlacesById(
        lodgingCatalog.filter((p) => !cityHint || placeInDestinationArea(p, cityHint)),
        lodgingSearch.filter(
          (p) => isLodgingPlace(p) && (!cityHint || placeInDestinationArea(p, cityHint)),
        ),
        limit,
      );
      contextPlaces = mergePlacesById(lodgingMerged, contextPlaces, limit);
    }
    // Nature follow-up ONLY when no city destination (avoid Bouba Ndjidda on a Kribi trip).
    if (
      nationwideParksQuery &&
      contextPlaces.filter(isNaturePlace).length < 3
    ) {
      const naturePlaces = await searchPlacesForGuide(
        "parc national réserve Waza Bénoué Korup Campo Dja",
        limit,
      );
      contextPlaces = mergePlacesById(
        contextPlaces.filter(isNaturePlace),
        naturePlaces.filter(isNaturePlace),
        limit,
      );
    }
    // Drop clearly distant places when a destination city is set.
    if (cityHint) {
      contextPlaces = contextPlaces.filter((p) => !isDistantForDestination(p, cityHint));
    }
    contextPlaces = prioritizeRelevantPlaces(contextPlaces, lastUser).slice(0, limit);
  } catch (err) {
    console.error("[chat] knowledge-base search failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    contextPlaces = [];
  }

  // Prefer on-topic places in the UI cards (avoid restaurants on a parks question).
  const parkHint = extractSpecificParkHint(lastUser);
  const placesForUi = (() => {
    // Explicit hotel / lodging ask → only verified stays in the destination area.
    if (lodgingQuery) {
      const lodging = contextPlaces.filter(
        (p) =>
          isLodgingPlace(p) &&
          (!cityHint || placeInDestinationArea(p, cityHint)) &&
          (!cityHint || !isDistantForDestination(p, cityHint)),
      );
      return lodging;
    }
    // Restaurant / food ask → only food places (else empty → web fill).
    if (looksLikeRestaurantQuery(lastUser)) {
      return contextPlaces.filter((p) => {
        const blob = `${p.category || ""} ${placeFocusBlob(p)}`;
        if (!/restaurant|resto|cuisine|gastronom|maquis|food|bar\b/i.test(blob)) {
          return false;
        }
        return !cityHint || placeInDestinationArea(p, cityHint);
      });
    }
    // Destination-scoped itinerary / city guide: local tourist places only.
    if (cityHint && (itineraryMode || !parkHint)) {
      const inArea = contextPlaces.filter(
        (p) =>
          placeInDestinationArea(p, cityHint) &&
          isTouristInterestPlace(p) &&
          !isDistantForDestination(p, cityHint),
      );
      if (inArea.length) return inArea;
      if (itineraryMode) return [];
    }
    if (parkHint && !cityHint) {
      const needle = parkHint
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const specific = contextPlaces.filter((p) => {
        const loc = `${p.name || ""} ${p.city || ""}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return loc.includes(needle) || loc.includes(needle.replace(/benoue/i, "benoue"));
      });
      if (specific.length) return specific;
      // Known park asked but missing from KB — don't attach unrelated parks.
      return [];
    }
    if (looksLikeParksOrNatureQuery(lastUser) && !cityHint) {
      const nature = contextPlaces.filter(isNaturePlace);
      return nature.length ? nature : [];
    }
    if (cityHint) {
      const inCity = contextPlaces.filter(
        (p) => placeInDestinationArea(p, cityHint) && isTouristInterestPlace(p),
      );
      return inCity.length ? inCity : [];
    }
    // No city / park / nature intent: don't attach random KB places to generic chat.
    return [];
  })();

  // Prompt context: only on-topic KB hits (empty â†’ model + web must not invent from junk restaurants).
  const contextPlacesForPrompt =
    placesForUi.length > 0 ? placesForUi : [];

  const places = placesForUi.map((p) => ({
    id: p.id || p.name || randomUUID(),
    name: p.name || "Lieu",
    slug: p.slug || null,
    description:
      truncateForPrompt(p.short_description, 280) ||
      truncateForPrompt(p.description, 280) ||
      null,
    category: null,
    city: p.city,
    region: p.city,
    latitude: p.lat,
    longitude: p.lng,
    image_url: null,
    source_url: p.source_url,
    estimated_cost_xaf: p.price_from,
    relevance: itineraryMode
      ? placeRelevanceForTrip(p, cityHint, locale)
      : null,
  }));

  const context = contextPlacesForPrompt
    .map((p, i) =>
      [
        `${i + 1}. ${p.name}`,
        p.city ? `Ville: ${p.city}` : null,
        p.price_from != null ? `Prix dès ${p.price_from} XAF` : null,
        p.source_url ? `Source: ${p.source_url}` : null,
        truncateForPrompt(p.short_description, 220) ||
          truncateForPrompt(p.description, 220),
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");

  const kbInsufficient = isKbInsufficientForQuery(contextPlacesForPrompt, lastUser);
  const tourismTopic = looksLikeTourismWebTopic(lastUser);
  // Rule: if KB has nothing useful for this city/topic (hotel, resto, sites…), search the web.
  const needsWebFill =
    kbInsufficient &&
    (lodgingQuery ||
      tourismTopic ||
      looksLikeRestaurantQuery(lastUser) ||
      looksLikeActivityQuery(lastUser) ||
      looksLikeParksOrNatureQuery(lastUser) ||
      !!cityHint);
  const enableWeb = webSearchEnvEnabled() && (itineraryMode || needsWebFill);

  // External web search (Tavily → Brave) when KB is thin for this city/topic.
  let webHitsBlock = "";
  let webCitations: { title: string; url: string; type: "WEB" }[] = [];
  let webProvider: "tavily" | "brave" | "none" = "none";
  if (enableWeb) {
    const webQuery = buildTourismWebQuery({
      userText: lastUser,
      cityHint,
      lodging: lodgingQuery,
      restaurant: looksLikeRestaurantQuery(lastUser),
      parks: looksLikeParksOrNatureQuery(lastUser),
      activity: looksLikeActivityQuery(lastUser),
    });
    const web = await searchWeb({
      query: webQuery,
      maxResults: itineraryMode ? 6 : 5,
    });
    webProvider = web.provider;
    webCitations = webHitsToCitations(web.hits);
    webHitsBlock = formatWebHitsForPrompt(web.hits);
    console.info("[chat] web-search", {
      provider: web.provider,
      hits: web.hits.length,
      query: web.query.slice(0, 120),
    });
  }

  const contextWithWeb = webHitsBlock
    ? `${context}\n\nRÉSULTATS WEB (${webProvider}, à confirmer) :\n${webHitsBlock}`
    : context;

  console.info("[chat] retrieval", {
    tourismTopic,
    lodgingQuery,
    cityHint,
    kbInsufficient,
    needsWebFill,
    enableWeb,
    webProvider,
    webHits: webCitations.length,
    kbPromptCount: contextPlacesForPrompt.length,
    kbRawCount: contextPlaces.length,
    relevant: countRelevantKbHits(contextPlacesForPrompt, lastUser),
    uiNames: placesForUi.map((p) => p.name).slice(0, 8),
  });

  const system = buildSystemPrompt(locale, contextWithWeb, itineraryMode, {
    webEnabled: enableWeb,
    kbCount: countRelevantKbHits(contextPlacesForPrompt, lastUser),
    lodgingQuery,
    cityHint,
  });
  const modelId = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  let message: string;
  let provider = "kb";


  const webFallbackLines =
    webCitations.length > 0
      ? webCitations
          .slice(0, 5)
          .map((s) => `• **${s.title}**`)
          .join("\n")
      : null;


  const kbFallbackMessage = (webFailed: boolean) => {
    const dayCount = extractTripCalendarDays(lastUser);
    const lines =
      contextPlacesForPrompt.length > 0
        ? contextPlacesForPrompt
            .map((p) => {
              const bits = [
                `• **${p.name}**${p.city ? ` (${p.city})` : ""}`,
                p.price_from != null ? `dès ${p.price_from} XAF` : null,
              ].filter(Boolean);
              return bits.join(" — ");
            })
            .join("\n")
        : null;
    const park = parkHintEarly;

    if (itineraryMode) {
      const dest = cityHint || (locale === "en" ? "your destination" : "votre destination");
      const dateLabels = extractTripDateLabels(lastUser);
      const dayBlocks = Array.from({ length: dayCount }, (_, i) => {
        const place = contextPlacesForPrompt[i % Math.max(contextPlacesForPrompt.length, 1)];
        const placeHint =
          contextPlacesForPrompt.length > 0 && place
            ? locale === "en"
              ? `Focus on **${place.name}**${place.city ? ` (${place.city})` : ""} and nearby spots.`
              : `Priorisez **${place.name}**${place.city ? ` (${place.city})` : ""} et les environs.`
            : locale === "en"
              ? `Stay in / around ${dest}: beaches, local sites, meals.`
              : `Restez à / autour de ${dest} : plages, sites locaux, repas.`;
        let dateSuffix = "";
        if (dateLabels) {
          if (i === 0) dateSuffix = ` — ${dateLabels.start}`;
          else if (i === dayCount - 1) dateSuffix = ` — ${dateLabels.end}`;
          else dateSuffix = locale === "en" ? ` — day ${i + 1} of the stay` : ` — jour ${i + 1} du séjour`;
        }
        return locale === "en"
          ? `### Day ${i + 1}${dateSuffix}\n- Morning / afternoon / evening: ${placeHint}\n- Meals: local restaurants (confirm prices on site).\n${
              wantsLodgingHelp(lastUser) && i < dayCount - 1
                ? `- Lodging: choose a stay in ${dest} suited to your budget (recommendation only — not booked).`
                : ""
            }`
          : `### Jour ${i + 1}${dateSuffix}\n- Matin / après-midi / soir : ${placeHint}\n- Repas : restaurants locaux (confirmer les tarifs sur place).\n${
              wantsLodgingHelp(lastUser) && i < dayCount - 1
                ? `- Hébergement : choisir un séjour à ${dest} adapté au budget (recommandation seulement — non réservé).`
                : ""
            }`;
      }).join("\n\n");

      if (locale === "en") {
        return `## Draft itinerary for ${dest} (${dayCount} calendar days)\n\n${
          webFailed
            ? "Online verification was unavailable — treat details below as **unverified** and confirm on site.\n\n"
            : "Some details could not be fully verified.\n\n"
        }${dayBlocks}\n\n${
          lines
            ? `### Local places from the knowledge base\n${lines}\n\n`
            : ""
        }${
          wantsLodgingHelp(lastUser)
            ? `### Lodging\nLook for guesthouses / hotels in ${dest} that fit your budget and party size. SmartMboa does **not** confirm any reservation.\n\n`
            : ""
        }### Budget\nWork within your stated budget across lodging, local transport, activities and meals. Prefer known KB prices when present; otherwise mark amounts as indicative. If the budget looks tight for ${dayCount} days, shorten activities or choose simpler lodging.\n\nRetry shortly for a fully dated AI itinerary.`;
      }
      return `## Canevas d'itinéraire pour ${dest} (${dayCount} jours calendaires)\n\n${
        webFailed
          ? "La vérification en ligne est indisponible — considérez les détails ci-dessous comme **non vérifiés** et confirmez sur place.\n\n"
          : "Certaines informations n'ont pas pu être entièrement vérifiées.\n\n"
      }${dayBlocks}\n\n${
        lines
          ? `### Lieux locaux (base de connaissances)\n${lines}\n\n`
          : ""
      }${
        wantsLodgingHelp(lastUser)
          ? `### Hébergement\nRecherchez auberges / hôtels à ${dest} adaptés au budget et au nombre de voyageurs. SmartMboa **ne confirme aucune** réservation.\n\n`
          : ""
      }### Budget\nRépartissez le budget déclaré entre hébergement, transport local, activités et repas. Préférez les tarifs KB connus ; sinon marquez les montants comme indicatifs. Si le budget semble insuffisant pour ${dayCount} jours, réduisez les activités ou choisissez un hébergement plus simple.\n\nRéessayez sous peu pour un itinéraire IA entièrement daté.`;
    }

    if (locale === "en") {
      if (lines) {
        if (lodgingQuery) {
          return `Here are verified stays from our knowledge base for your request:\n\n${lines}\n\n${
            webFailed
              ? "Online verification was unavailable just now — confirm prices and availability with the property."
              : "Tell me your budget or neighborhood and I can refine this list."
          }\n\nSmartMboa does **not** confirm bookings; you reserve with the provider (or via the Stays demo page).`;
        }
        return `Here are verified places from our knowledge base:\n\n${lines}\n\n${
          webFailed
            ? "Online verification was unavailable just now, so some details (prices, hours, access) could not be confirmed."
            : "Some details could not be fully verified."
        } Tell me a city, region, or preferences and I can refine this.`;
      }
      if (park && looksLikeFactualTourismQuery(lastUser)) {
        return `I could not verify current entry fees or practical details for **${park}** right now (knowledge base has no matching tariff, and online verification failed). Please try again shortly, or tell me another destination / preference.`;
      }
      return "I could not complete a fully verified answer right now. Tell me a city, region, or type of place (park, beach, museum…) and I will help.";
    }
    if (lines) {
      if (lodgingQuery) {
        return `Voici des hébergements vérifiés de notre base de connaissances pour votre demande :\n\n${lines}\n\n${
          webFailed
            ? "La vérification en ligne est indisponible pour le moment — confirmez tarifs et disponibilité auprès de l'établissement."
            : "Précisez votre budget ou un quartier et j'affine la sélection."
        }\n\nSmartMboa **ne confirme aucune** réservation ; vous réservez auprès du prestataire (ou via la page Hébergements démo).`;
      }
      if (webFallbackLines && (looksLikeRestaurantQuery(lastUser) || looksLikeActivityQuery(lastUser) || lodgingQuery)) {
        return `Voici des pistes trouvées sur le web (à confirmer) :

${webFallbackLines}

${lines ? `Lieux KB proches :
${lines}

` : ""}Les sources web sont listées sous la réponse. Précisez budget / quartier pour affiner.`;
      }
      return `Voici des lieux vérifiés de notre base de connaissances :\n\n${lines}\n\n${
        webFailed
          ? "La vérification en ligne est indisponible pour le moment : certains détails (tarifs, horaires, accès) n'ont pas pu être confirmés."
          : "Certaines informations n'ont pas pu être entièrement vérifiées."
      } Précisez une ville, une région ou vos préférences pour affiner.`;
    }
    if (park && looksLikeFactualTourismQuery(lastUser)) {
      return `Je n'ai pas pu vérifier les tarifs / infos pratiques actuels pour le **parc ${park}** pour le moment (pas de tarif correspondant en base, et la vérification en ligne a échoué). Réessayez dans un instant, ou précisez une autre destination / préférence.`;
    }
    return webFallbackLines
      ? `Voici des pistes trouvées sur le web (à confirmer) :

${webFallbackLines}

Les sources sont listées sous la réponse. Précisez votre besoin pour affiner.`
      : "Je n’ai pas pu produire une réponse entièrement vérifiée pour le moment. Indiquez une ville, une région ou un type de lieu (parc, plage, musée…) et je vous aide.";
  };

  if (process.env.OPENROUTER_API_KEY) {
    // Web search is done via Tavily/Brave above; OpenRouter is text-only (no web plugin).
    const callOpenRouter = async (maxTokens: number) => {
      const payload: Record<string, unknown> = {
        model: modelId,
        temperature: 0.35,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: lastUser },
        ],
      };
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://webmintoul.local",
          "X-Title": "SmartMboa MINTOUL",
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        choices?: {
          message?: {
            content?: string;
            annotations?: UrlCitationAnnotation[];
          };
        }[];
        error?: { message?: string; code?: number | string };
      } | null;
      return { res, data, maxTokens };
    };

    // Prefer a credit-safe output budget; itineraries need room but must not 402 the key.
    let maxTok = itineraryMode ? 4_000 : lodgingQuery ? 1_800 : Math.min(CHAT_MAX_OUTPUT_TOKENS, 2_500);
    let { res, data } = await callOpenRouter(maxTok);

    // If still blocked by max_tokens affordability, retry once at the reported budget.
    if (!res.ok) {
      const rawMsg = sanitizeProviderError(
        data?.error?.message || `OpenRouter HTTP ${res.status}`,
      );
      const affordable = parseAffordableMaxTokens(rawMsg);
      if (affordable && affordable < maxTok) {
        console.warn("[chat] OpenRouter credit/token limit — retrying with lower max_tokens", {
          from: maxTok,
          to: affordable,
        });
        maxTok = affordable;
        ({ res, data } = await callOpenRouter(maxTok));
      }
    }

    if (!res.ok) {
      const rawMsg = sanitizeProviderError(
        data?.error?.message || `OpenRouter HTTP ${res.status}`,
      );
      console.error("[chat] OpenRouter error", {
        status: res.status,
        model: modelId,
        max_tokens: maxTok,
        itinerary: itineraryMode,
        web: enableWeb,
        kb_count: contextPlacesForPrompt.length,
        message: rawMsg,
      });

      // Prefer a useful KB answer only for real tourism / itinerary asks.
      if (itineraryMode || tourismTopic || lodgingQuery) {
        message = kbFallbackMessage(enableWeb && webCitations.length === 0);
        provider = "kb-fallback";
      } else if (isCreditOrTokenError(res.status, rawMsg)) {
        return NextResponse.json(
          {
            detail:
              locale === "en"
                ? "The AI guide is temporarily unavailable: credit or token budget exceeded. Try again later."
                : "Le guide IA est temporairement indisponible : budget crédits / tokens insuffisant. Réessayez plus tard.",
          },
          { status: 402 },
        );
      } else {
        return NextResponse.json(
          {
            detail:
              locale === "en"
                ? "The AI guide is temporarily unavailable. Please try again."
                : "Le guide IA est temporairement indisponible. Réessayez dans un moment.",
          },
          { status: 502 },
        );
      }
    } else {
      message = data?.choices?.[0]?.message?.content?.trim() || "";
      const orCitations = citationsFromAnnotations(data?.choices?.[0]?.message?.annotations);
      if (orCitations.length) {
        const seen = new Set(webCitations.map((c) => c.url));
        for (const c of orCitations) {
          if (!seen.has(c.url)) webCitations.push(c);
        }
      }
      if (!message) {
        console.error("[chat] OpenRouter empty content", {
          model: modelId,
          web: enableWeb,
          kb_count: contextPlacesForPrompt.length,
        });
        message = kbFallbackMessage(enableWeb && webCitations.length === 0);
        provider = "kb-fallback";
      } else {
        provider = "openrouter";
      }
    }
  } else if (process.env.GEMINI_API_KEY) {
    try {
      const result = await generateText({
        model: google("gemini-2.0-flash"),
        system,
        prompt: lastUser,
        maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      });
      message = result.text;
      provider = "gemini";
    } catch (err) {
      const rawMsg = sanitizeProviderError(
        err instanceof Error ? err.message : String(err),
      );
      console.error("[chat] Gemini error", { message: rawMsg });
      if (itineraryMode || tourismTopic) {
        message = kbFallbackMessage(true);
        provider = "kb-fallback";
      } else if (isCreditOrTokenError(0, rawMsg)) {
        return NextResponse.json(
          {
            detail:
              locale === "en"
                ? "The AI guide is temporarily unavailable: credit or token budget exceeded."
                : "Le guide IA est temporairement indisponible : budget crédits / tokens insuffisant.",
          },
          { status: 402 },
        );
      } else {
        return NextResponse.json(
          {
            detail:
              locale === "en"
                ? "The AI guide is temporarily unavailable."
                : "Le guide IA est temporairement indisponible.",
          },
          { status: 502 },
        );
      }
    }
  } else if (contextPlaces.length) {
    message = `Voici des lieux réels de notre base pour ta demande :\n\n${contextPlaces
      .map(
        (p) =>
          `• **${p.name}**${p.city ? ` (${p.city})` : ""}${p.price_from != null ? ` — dès ${p.price_from} XAF` : ""}`,
      )
      .join("\n")}\n\nAjoute OPENROUTER_API_KEY (ou GEMINI_API_KEY) dans .env.local pour le guide conversationnel.`;
  } else {
    message =
      "Aucune clé IA configurée et aucun lieu trouvé. Ajoute OPENROUTER_API_KEY dans .env.local.";
  }

  const prepared = prepareAiMarkdown(message);
  message = prepared.markdown;

  const kbSources = placesForUi
    .filter((p) => p.source_url && /^https?:\/\//i.test(p.source_url))
    .map((p) => ({
      title: p.name || "Lieu",
      url: p.source_url as string,
      type: "KB" as const,
    }));

  const ui_sources = (() => {
    const seen = new Set<string>();
    const out: { title: string; url: string; type: "WEB" | "KB" }[] = [];
    for (const s of [...webCitations, ...prepared.sources.map((x) => ({ ...x, type: "WEB" as const })), ...kbSources]) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
    return out;
  })();

  return NextResponse.json({
    conversation_id: conversationId,
    role: "assistant",
    message,
    text: message,
    provider,
    places,
    sources: placesForUi.map((p) => ({
      title: p.name,
      city: p.city,
      url: p.source_url,
    })),
    ui_sources,
    response_type: itineraryMode
      ? "ITINERARY"
      : places.length
        ? "PLACE_LIST"
        : "SIMPLE_ANSWER",
  });
}
