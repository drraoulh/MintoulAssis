import { randomUUID } from 'node:crypto';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

import {
  buildFilmAssistantContext,
  buildFilmSystemPrompt,
} from '@/lib/film/assistant-context';
import {
  composeDossierAnswer,
  fetchEntityDossier,
  shouldFetchDossier,
  type EntityDossier,
} from '@/lib/film/filmography';
import { createTtlCache, withTimeout } from '@/lib/film/ttl-cache';
import {
  composeMinacAnswer,
  formatMinacForPrompt,
  looksLikeMinacOrPersonQuery,
  lookupMinacOfficials,
  minacToPersonCards,
} from '@/lib/film/minac-team';
import {
  fetchOnlinePersonProfile,
  onlineProfileToPersonUI,
  type OnlinePersonProfile,
} from '@/lib/film/person-photo';
import { researchCameroonCinema, type CinemaResearch } from '@/lib/film/research-cinema';
import { prepareAiMarkdown } from '@/lib/markdown/sanitize-ai-markdown';
import type { PersonUI } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CHAT_MAX_OUTPUT_TOKENS = 4_500;
const RESEARCH_DEADLINE_MS = 6_000;
/** Free web search is often blocked / captcha'd — don't let it hold the answer back. */
const WEB_SEARCH_DEADLINE_MS = 4_000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

type MinacLookup = Awaited<ReturnType<typeof lookupMinacOfficials>>;

const minacCache = createTtlCache<MinacLookup>(SIX_HOURS);
const researchCache = createTtlCache<CinemaResearch>(SIX_HOURS);
const photoCache = createTtlCache<OnlinePersonProfile | null>(SIX_HOURS);
const dossierCache = createTtlCache<EntityDossier | null>(SIX_HOURS);

function emptyResearch(query: string): CinemaResearch {
  return { hits: [], provider: 'none', query, block: '', citations: [] };
}

/** Fastest first; each model has its own free-tier quota. `minimal` is only accepted by some models. */
const GEMINI_MODELS: { model: string; thinking: 'minimal' | 'low' }[] = [
  { model: 'gemini-3.5-flash', thinking: 'minimal' },
  { model: 'gemini-3.5-flash-lite', thinking: 'minimal' },
  { model: 'gemini-3.8-flash', thinking: 'low' },
  { model: 'gemini-flash-latest', thinking: 'low' },
];

type Incoming = {
  message?: string;
  messages?: { role: string; content: string }[];
  conversation_id?: string;
  locale?: string;
};

function lastUserMessage(body: Incoming): string {
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }
  const msgs = body.messages || [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === 'user' && typeof msgs[i].content === 'string') {
      return msgs[i].content.trim();
    }
  }
  return '';
}

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const HISTORY_TURNS = 8;
const HISTORY_CHARS = 2_000;

/** Prior turns (excluding the current user message), oldest first. */
function priorTurns(body: Incoming, lastUser: string): ChatTurn[] {
  const msgs = (body.messages || [])
    .filter(
      (m): m is ChatTurn =>
        (m?.role === 'user' || m?.role === 'assistant') &&
        typeof m.content === 'string' &&
        Boolean(m.content.trim()),
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, HISTORY_CHARS) }));
  const last = msgs[msgs.length - 1];
  if (last?.role === 'user' && last.content === lastUser.slice(0, HISTORY_CHARS)) msgs.pop();
  return msgs.slice(-HISTORY_TURNS);
}

const FOLLOW_UP_RE =
  /\b(il|elle|lui|ils|elles|ses|son|sa|leurs?|cette|cet|ce\s+film|cette\s+s[ée]rie|celui|celle|he|she|him|his|her|they|their|it|its|this|that|those)\b/i;

/** Follow-ups like "et ses séries ?" inherit the entity from the previous question. */
function researchQuery(lastUser: string, history: ChatTurn[]): string {
  const prevUser = [...history].reverse().find((t) => t.role === 'user')?.content;
  if (!prevUser) return lastUser;
  const words = lastUser.split(/\s+/).length;
  const hasName = /\b[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+/u.test(lastUser);
  if (hasName || words > 12 || !FOLLOW_UP_RE.test(lastUser)) return lastUser;
  return `${prevUser.slice(0, 300)} — ${lastUser}`;
}

const EN_WORDS =
  /\b(the|who|what|which|when|where|how|is|are|was|were|did|does|has|have|his|her|their|movies?|films?\s+(by|of)|series\s+(by|of)|directed|produced|played|tell|about|list|show|me|please|and|with|from)\b/gi;
const FR_WORDS =
  /\b(le|la|les|des|du|de|qui|quel|quels|quelle|quelles|est|sont|a-t-il|a-t-elle|ses|son|sa|leurs?|réalis\w*|realis\w*|joué|joue|dans|avec|pour|parle|moi|liste|donne|et|une?|ce|cette|merci)\b/gi;

/** Answer in the language the user wrote in; fall back to the UI locale. */
function detectLanguage(text: string, fallback: 'fr' | 'en'): 'fr' | 'en' {
  const en = text.match(EN_WORDS)?.length ?? 0;
  const fr = (text.match(FR_WORDS)?.length ?? 0) + (/[éèêàùçôî]/i.test(text) ? 1 : 0);
  if (en === fr) return fallback;
  return en > fr ? 'en' : 'fr';
}

/** Drop source / photo attribution lines and turn links into plain text. */
function stripSourceMentions(markdown: string): string {
  return markdown
    .split('\n')
    .filter(
      (line) =>
        !/^\s*[*_>\-\s]*(sources?|photo(\s+officielle)?|source\s*\/\s*photo|r[ée]f[ée]rences?|references?)\b[^|]*[:：]/i.test(line) &&
        !/^\s*[*_\s]*\(?\s*photo\s*:/i.test(line),
    )
    .join('\n')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/\s*\((?:photo\s*:\s*)?(?:https?:\/\/)?(?:www\.)?[\w.-]+\.(?:org|com|cm|tv|net)(?:\/[^\s)]*)?\)/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksLikeGreeting(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 100) return false;
  return /^(bonjour|bonsoir|salut|hello|hi|hey|coucou|merci|thanks|ok|okay)([\s,!.?;:]*)?$/i.test(
    t,
  );
}

function greeting(locale: string): string {
  if (locale === 'en') {
    return `Hello — I'm the **SmartMboa Film** assistant for the **Cameroon movie industry**.

Ask about producers, directors, actors, actresses, films, festivals — or **MINAC** officials (Ministry of Arts and Culture). For ministry personalities I check the official organigram first, then the web.`;
  }
  return `Bonjour — je suis l’assistant **SmartMboa Film** pour l’**industrie du cinéma camerounais**.

Demandez producteurs, réalisateurs, acteurs, actrices, films, festivals — ou personnalités du **MINAC** (Ministère des Arts et de la Culture). Pour l’équipe dirigeante, je consulte d’abord l’organigramme officiel, puis le web.`;
}

function sanitizeProviderError(msg: string): string {
  return msg.replace(/\s+/g, ' ').trim().slice(0, 400);
}

function isCreditOrTokenError(status: number, msg: string): boolean {
  return (
    status === 402 ||
    /credit|afford|max_tokens|insufficient|quota|billing/i.test(msg)
  );
}

function parseAffordableMaxTokens(msg: string): number | null {
  const m = msg.match(/afford\s+(\d+)/i) || msg.match(/max[_\s-]?tokens?[^\d]*(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 256 ? Math.min(n, 3_500) : null;
}

function composeFromResearch(
  locale: string,
  hits: { title: string; url: string; snippet: string }[],
  kbContext: string,
): string {
  const primary = hits[0];
  if (!primary?.snippet) return '';

  const cleanTitle = primary.title
    .replace(/\s*\(Wikipedia[^)]*\)/i, '')
    .replace(/\s*—\s*.*$/, '')
    .trim();
  const related = hits
    .slice(1, 4)
    .filter((h) => h.snippet && h.url !== primary.url)
    .map((h) => {
      const t = h.title.replace(/\s*\(Wikipedia[^)]*\)/i, '').trim();
      return `- **${t}** — ${h.snippet.slice(0, 180).trim()}${h.snippet.length > 180 ? '…' : ''}`;
    });

  if (locale === 'en') {
    return [
      `## ${cleanTitle}`,
      '',
      primary.snippet.trim(),
      '',
      related.length ? `### Related Cameroon cinema` : '',
      ...related,
      related.length ? '' : '',
      kbContext
        ? `\n### SmartMboa notes\n${kbContext.slice(0, 700)}`
        : '',
    ]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n')
      .trim();
  }

  return [
    `## ${cleanTitle}`,
    '',
    primary.snippet.trim(),
    '',
    related.length ? `### Liens cinéma camerounais` : '',
    ...related,
    related.length ? '' : '',
    kbContext
      ? `\n### Notes SmartMboa\n${kbContext.slice(0, 700)}`
      : '',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

function researchFallback(
  locale: string,
  research: {
    block: string;
    hits: { title: string; url: string; snippet: string }[];
  },
  kbContext: string,
): string {
  const composed = composeFromResearch(locale, research.hits, kbContext);
  if (composed) return composed;

  if (research.block) {
    if (locale === 'en') {
      return `From online Cameroon film sources:\n\n${research.block.slice(0, 2400)}`;
    }
    return `D’après les sources en ligne sur le cinéma camerounais :\n\n${research.block.slice(0, 2400)}`;
  }
  if (locale === 'en') {
    return kbContext
      ? `From SmartMboa Film notes:\n\n${kbContext.slice(0, 1600)}\n\nI could not reach live web sources just now — retry shortly.`
      : 'I could not find reliable online sources for that name yet. Try another spelling, or ask about a film / series title.';
  }
  return kbContext
    ? `D’après les notes SmartMboa Film :\n\n${kbContext.slice(0, 1600)}\n\nLes sources web n’ont pas répondu — réessayez dans un instant.`
    : 'Je n’ai pas encore trouvé de sources fiables pour ce nom. Essayez une autre orthographe, ou un titre de film / série.';
}

export async function POST(req: Request) {
  let body: Incoming;
  try {
    body = (await req.json()) as Incoming;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const uiLocale = body.locale === 'en' ? 'en' : 'fr';
  const conversationId = body.conversation_id?.trim() || randomUUID();
  const lastUser = lastUserMessage(body);

  if (!lastUser) {
    return NextResponse.json(
      { detail: uiLocale === 'en' ? 'Empty message.' : 'Message vide.' },
      { status: 400 },
    );
  }

  const locale = detectLanguage(lastUser, uiLocale);

  if (looksLikeGreeting(lastUser)) {
    const message = greeting(locale);
    return NextResponse.json({
      conversation_id: conversationId,
      role: 'assistant',
      message,
      text: message,
      provider: 'greeting',
      response_type: 'SIMPLE_ANSWER',
      ui_sources: [],
    });
  }

  const history = priorTurns(body, lastUser);
  const query = researchQuery(lastUser, history);

  // MINAC organigram, KB, filmography dossier, web research and portrait all run in
  // parallel under a hard deadline; MINAC matches take precedence once resolved.
  const noMinac: MinacLookup = { matches: [], people: [], sourceUrl: 'https://minac.gov.cm/fr/team' };
  const [minacRaw, researchRaw, personRaw, dossierRaw] = await Promise.all([
    looksLikeMinacOrPersonQuery(query)
      ? withTimeout(minacCache(query, () => lookupMinacOfficials(query)), RESEARCH_DEADLINE_MS, noMinac)
      : Promise.resolve(noMinac),
    withTimeout(researchCache(query, () => researchCameroonCinema(query)), WEB_SEARCH_DEADLINE_MS, emptyResearch(query)),
    withTimeout(photoCache(query, () => fetchOnlinePersonProfile(query)), RESEARCH_DEADLINE_MS, null),
    shouldFetchDossier(query)
      ? withTimeout(dossierCache(`${locale}:${query}`, () => fetchEntityDossier(query, locale)), RESEARCH_DEADLINE_MS, null)
      : Promise.resolve(null),
  ]);
  const minac = minacRaw;
  const minacPeople = minacToPersonCards(minac.matches);
  const minacBlock = formatMinacForPrompt(minac.matches, locale);
  const runWeb = minac.matches.length === 0;
  const kbContext = buildFilmAssistantContext(query, locale);
  const research = runWeb ? researchRaw : emptyResearch(query);
  const onlinePerson = runWeb ? personRaw : null;
  const dossier = runWeb ? dossierRaw : null;

  const onlinePeople: PersonUI[] = onlinePerson
    ? [onlineProfileToPersonUI(onlinePerson)]
    : [];
  const peopleCards: PersonUI[] = minacPeople.length ? minacPeople : onlinePeople;

  const personPhotoBlock = onlinePerson
    ? locale === 'en'
      ? `PERSON SHOWN IN THE UI (portrait already displayed — don't mention it):\n- Name: ${onlinePerson.name}\n- Role: ${onlinePerson.title || '—'}`
      : `PERSONNE AFFICHÉE DANS L’UI (portrait déjà affiché — ne le mentionne pas) :\n- Nom : ${onlinePerson.name}\n- Rôle : ${onlinePerson.title || '—'}`
    : '';

  const dossierBlock = dossier?.block
    ? locale === 'en'
      ? `DOSSIER FILMOGRAPHIE — "${dossier.query}" (full Wikipedia pages + Wikidata credits; authoritative for titles, years, roles, cast):\n${dossier.block}`
      : `DOSSIER FILMOGRAPHIE — « ${dossier.query} » (pages Wikipédia complètes + crédits Wikidata ; référence pour titres, années, rôles, casting) :\n${dossier.block}`
    : '';

  const contextWithWeb = [
    minacBlock,
    dossierBlock,
    personPhotoBlock,
    kbContext,
    research.block
      ? `RECHERCHE WEB / WIKIPÉDIA (${research.provider}) — industrie cinéma Cameroun :\n${research.block}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const system = buildFilmSystemPrompt(locale, contextWithWeb, true);
  const modelId = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  let message = '';
  let provider = 'research';

  // Authoritative organigram answer when we have a clear MINAC match and no LLM key
  const minacAnswer = composeMinacAnswer(locale, minac.matches);

  const fallback = (): { message: string; provider: string } => {
    if (minacAnswer) return { message: minacAnswer, provider: 'minac-organigram' };
    if (dossier) return { message: composeDossierAnswer(dossier, locale), provider: 'filmography' };
    return {
      message: researchFallback(locale, research, kbContext),
      provider: research.hits.length ? 'research-fallback' : 'kb',
    };
  };

  const chatMessages: ChatTurn[] = [...history, { role: 'user', content: lastUser }];

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (minac.matches.length && !openRouterKey && !geminiKey) {
    message = minacAnswer;
    provider = 'minac-organigram';
  } else if (openRouterKey && !geminiKey) {
    const callOpenRouter = async (maxTokens: number) => {
      const payload: Record<string, unknown> = {
        model: modelId,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, ...chatMessages],
      };
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER || 'https://smartmboatour.com',
          'X-Title': 'SmartMboa Film Assistant',
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      } | null;
      return { res, data };
    };

    let maxTok = Math.min(CHAT_MAX_OUTPUT_TOKENS, 3_500);
    let { res, data } = await callOpenRouter(maxTok);

    if (!res.ok) {
      const rawMsg = sanitizeProviderError(
        data?.error?.message || `OpenRouter HTTP ${res.status}`,
      );
      const affordable = parseAffordableMaxTokens(rawMsg);
      if (affordable && affordable < maxTok) {
        maxTok = affordable;
        ({ res, data } = await callOpenRouter(maxTok));
      }
    }

    if (!res.ok) {
      const rawMsg = sanitizeProviderError(
        data?.error?.message || `OpenRouter HTTP ${res.status}`,
      );
      console.error('[film-chat] OpenRouter error', {
        status: res.status,
        message: rawMsg,
        researchHits: research.hits.length,
      });
      if (isCreditOrTokenError(res.status, rawMsg) && !research.block && !dossier) {
        return NextResponse.json(
          {
            detail:
              locale === 'en'
                ? 'Film AI is temporarily unavailable: credit or token budget exceeded.'
                : 'L’IA Film est temporairement indisponible : budget crédits / tokens insuffisant.',
          },
          { status: 402 },
        );
      }
      ({ message, provider } = fallback());
    } else {
      message = data?.choices?.[0]?.message?.content?.trim() || '';
      if (!message) ({ message, provider } = fallback());
      else provider = 'openrouter';
    }
  } else if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    // Free-tier quotas are per model: fall through to the next one on 429 / retired models
    const preferred = process.env.GEMINI_CHAT_MODEL?.trim();
    const models = preferred
      ? [
          GEMINI_MODELS.find((m) => m.model === preferred) ?? { model: preferred, thinking: 'low' as const },
          ...GEMINI_MODELS.filter((m) => m.model !== preferred),
        ]
      : GEMINI_MODELS;
    const grounded = process.env.GEMINI_SEARCH_GROUNDING?.trim() === '1';
    for (const { model: modelName, thinking } of models) {
      try {
        const result = await generateText({
          model: google(modelName),
          system,
          messages: chatMessages,
          temperature: 0.2,
          maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(15_000),
          providerOptions: { google: { thinkingConfig: { thinkingLevel: thinking } } },
          ...(grounded ? { tools: { google_search: google.tools.googleSearch({}) } } : {}),
        });
        if (result.text.trim()) {
          message = result.text;
          provider = `gemini:${modelName}`;
          break;
        }
      } catch (err) {
        console.warn('[film-chat] Gemini error', {
          model: modelName,
          error: sanitizeProviderError(err instanceof Error ? err.message : String(err)),
        });
      }
    }
    if (!message.trim()) ({ message, provider } = fallback());
  } else {
    ({ message, provider } = fallback());
  }

  const prepared = prepareAiMarkdown(stripSourceMentions(message));
  message = prepared.markdown;

  const ui_sources = (() => {
    const seen = new Set<string>();
    const out: { title: string; url: string; type: 'WEB' | 'KB' }[] = [];
    if (minac.matches.length) {
      out.push({
        title: 'MINAC — Équipe dirigeante (organigramme)',
        url: minac.sourceUrl,
        type: 'WEB',
      });
      seen.add(minac.sourceUrl);
    }
    for (const s of [
      ...(dossier?.citations || []),
      ...research.citations,
      ...prepared.sources.map((x) => ({ ...x, type: 'WEB' as const })),
    ]) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
    return out;
  })();

  const images = peopleCards
    .filter((p) => p.photoUrl)
    .map((p) => {
      let domain = 'web';
      try {
        domain = p.sourceUrl ? new URL(p.sourceUrl).hostname : domain;
      } catch {
        /* keep */
      }
      return {
        image_url: p.photoUrl!,
        page_url: p.sourceUrl || minac.sourceUrl,
        title: `${p.name} — ${p.title || ''}`.trim(),
        source_domain: domain,
        alt_text: p.name,
      };
    });

  console.info('[film-chat] done', {
    provider,
    minac: minac.matches.length,
    onlinePerson: onlinePerson?.name || null,
    photo: Boolean(peopleCards[0]?.photoUrl),
    research: research.provider,
    hits: research.hits.length,
    dossier: dossier?.wiki.map((w) => `${w.lang}:${w.title}`).join(', ') || null,
    history: history.length,
    query: (research.query || lastUser).slice(0, 100),
  });

  return NextResponse.json({
    conversation_id: conversationId,
    role: 'assistant',
    message,
    text: message,
    provider,
    response_type: peopleCards.length ? 'PERSON_PROFILE' : 'SIMPLE_ANSWER',
    ui_sources,
    places: [],
    people: peopleCards,
    images,
  });
}
