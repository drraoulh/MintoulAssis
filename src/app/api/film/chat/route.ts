import { randomUUID } from 'node:crypto';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

import {
  buildFilmAssistantContext,
  buildFilmSystemPrompt,
} from '@/lib/film/assistant-context';
import {
  composeMinacAnswer,
  formatMinacForPrompt,
  looksLikeMinacOrPersonQuery,
  lookupMinacOfficials,
  minacToPersonCards,
} from '@/lib/film/minac-team';
import { researchCameroonCinema } from '@/lib/film/research-cinema';
import { prepareAiMarkdown } from '@/lib/markdown/sanitize-ai-markdown';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CHAT_MAX_OUTPUT_TOKENS = 4_500;

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
      `**Source:** [${cleanTitle}](${primary.url})`,
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
    `**Source :** [${cleanTitle}](${primary.url})`,
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

  const locale = body.locale === 'en' ? 'en' : 'fr';
  const conversationId = body.conversation_id?.trim() || randomUUID();
  const lastUser = lastUserMessage(body);

  if (!lastUser) {
    return NextResponse.json(
      { detail: locale === 'en' ? 'Empty message.' : 'Message vide.' },
      { status: 400 },
    );
  }

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

  // 1) Official MINAC organigram BEFORE general web research
  const minac =
    looksLikeMinacOrPersonQuery(lastUser)
      ? await lookupMinacOfficials(lastUser)
      : { matches: [], people: [], sourceUrl: 'https://minac.gov.cm/fr/team' };
  const minacPeople = minacToPersonCards(minac.matches);
  const minacBlock = formatMinacForPrompt(minac.matches, locale);

  // 2) KB + web (still run when no organigram hit, or to enrich cinema figures)
  const runWeb = minac.matches.length === 0;
  const [kbContext, research] = await Promise.all([
    Promise.resolve(buildFilmAssistantContext(lastUser, locale)),
    runWeb
      ? researchCameroonCinema(lastUser)
      : Promise.resolve({
          hits: [] as { title: string; url: string; snippet: string; provider: 'tavily' | 'brave' }[],
          provider: 'none' as const,
          query: lastUser,
          block: '',
          citations: [] as { title: string; url: string; type: 'WEB' }[],
        }),
  ]);

  const contextWithWeb = [
    minacBlock,
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

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (minac.matches.length && !openRouterKey && !geminiKey) {
    message = minacAnswer;
    provider = 'minac-organigram';
  } else if (openRouterKey) {
    const callOpenRouter = async (maxTokens: number) => {
      const payload: Record<string, unknown> = {
        model: modelId,
        temperature: 0.35,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: lastUser },
        ],
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
      if (isCreditOrTokenError(res.status, rawMsg) && !research.block) {
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
      message =
        minacAnswer || researchFallback(locale, research, kbContext);
      provider = minacAnswer ? 'minac-organigram' : 'research-fallback';
    } else {
      message = data?.choices?.[0]?.message?.content?.trim() || '';
      if (!message) {
        message =
          minacAnswer || researchFallback(locale, research, kbContext);
        provider = minacAnswer ? 'minac-organigram' : 'research-fallback';
      } else {
        provider = 'openrouter';
      }
    }
  } else if (geminiKey) {
    try {
      const result = await generateText({
        model: google('gemini-2.0-flash'),
        system,
        prompt: lastUser,
        maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      });
      message = result.text;
      provider = 'gemini';
    } catch (err) {
      console.error('[film-chat] Gemini error', err);
      message =
        minacAnswer || researchFallback(locale, research, kbContext);
      provider = minacAnswer ? 'minac-organigram' : 'research-fallback';
    }
  } else {
    message =
      minacAnswer || researchFallback(locale, research, kbContext);
    provider = minacAnswer
      ? 'minac-organigram'
      : research.hits.length
        ? 'wikipedia'
        : 'kb';
  }

  const prepared = prepareAiMarkdown(message);
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
      ...research.citations,
      ...prepared.sources.map((x) => ({ ...x, type: 'WEB' as const })),
    ]) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
    return out;
  })();

  const images = minacPeople
    .filter((p) => p.photoUrl)
    .map((p) => ({
      image_url: p.photoUrl!,
      page_url: p.sourceUrl || minac.sourceUrl,
      title: `${p.name} — ${p.title || ''}`.trim(),
      source_domain: 'minac.gov.cm',
      alt_text: p.name,
    }));

  console.info('[film-chat] done', {
    provider,
    minac: minac.matches.length,
    research: research.provider,
    hits: research.hits.length,
    query: (research.query || lastUser).slice(0, 100),
  });

  return NextResponse.json({
    conversation_id: conversationId,
    role: 'assistant',
    message,
    text: message,
    provider,
    response_type: minacPeople.length ? 'PERSON_PROFILE' : 'SIMPLE_ANSWER',
    ui_sources,
    places: [],
    people: minacPeople,
    images,
  });
}
