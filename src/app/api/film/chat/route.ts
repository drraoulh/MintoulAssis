import { randomUUID } from 'node:crypto';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

import {
  buildFilmAssistantContext,
  buildFilmSystemPrompt,
} from '@/lib/film/assistant-context';
import { prepareAiMarkdown } from '@/lib/markdown/sanitize-ai-markdown';
import {
  buildCinemaWebQuery,
  formatWebHitsForPrompt,
  searchWeb,
  webHitsToCitations,
  webSearchEnvEnabled,
} from '@/lib/web-search';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CHAT_MAX_OUTPUT_TOKENS = 4_000;

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
    return `Hello — I'm the **SmartMboa Film** assistant for **Cameroon cinematography**.

Ask me about filmmakers, producers, actors, films, festivals (Écrans Noirs…), or how to shoot / premiere in Cameroon.`;
  }
  return `Bonjour — je suis l’assistant **SmartMboa Film** pour la **cinématographie camerounaise**.

Posez-moi une question sur un cinéaste, producteur, acteur, film, festival (Écrans Noirs…) ou sur comment tourner / lancer une première au Cameroun.`;
}

function looksLikeCinemaPersonOrFilm(text: string): boolean {
  return /qui\s+est|who\s+is|acteur|actrice|actor|réalisat|director|producteur|producer|cinéaste|filmmaker|film\b|movie|long[-\s]?m[eé]trage|casting|star/i.test(
    text,
  );
}

function looksLikeFestival(text: string): boolean {
  return /festival|écrans?\s*noirs|ecrans?\s*noirs|mis\s*me\s*binga|compétition|selection|sélection/i.test(
    text,
  );
}

function looksLikeProduction(text: string): boolean {
  return /tournage|production|fixer|permis|autorisation|matériel|studio|salle|premi[eè]re|projection|lieu\s+de\s+tournage|shoot/i.test(
    text,
  );
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
  return Number.isFinite(n) && n >= 256 ? Math.min(n, 3_000) : null;
}

function kbOnlyFallback(locale: string, context: string): string {
  if (locale === 'en') {
    return context
      ? `Here is what I can share from SmartMboa Film’s Cameroon cinema notes (verify details online if critical):\n\n${context.slice(0, 1800)}\n\nAdd an AI key for fuller answers, or ask about a specific filmmaker, film, or festival.`
      : 'I need an AI key configured to answer in depth. Meanwhile ask about Écrans Noirs, projection halls, or a known Cameroonian filmmaker.';
  }
  return context
    ? `Voici ce que je peux partager à partir des notes cinéma Cameroun de SmartMboa Film (vérifiez les détails critiques en ligne) :\n\n${context.slice(0, 1800)}\n\nAjoutez une clé IA pour des réponses plus riches, ou demandez un cinéaste, un film ou un festival précis.`
    : 'Une clé IA est nécessaire pour répondre en profondeur. En attendant, demandez Écrans Noirs, les salles de projection, ou un cinéaste camerounais connu.';
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

  const context = buildFilmAssistantContext(lastUser, locale);
  const personOrFilm = looksLikeCinemaPersonOrFilm(lastUser);
  const festival = looksLikeFestival(lastUser);
  const production = looksLikeProduction(lastUser);

  // Strong agent: almost always search the web for cinema Q&A when keys exist
  const enableWeb =
    webSearchEnvEnabled() &&
    (personOrFilm || festival || production || lastUser.length > 12);

  let webHitsBlock = '';
  let webCitations: { title: string; url: string; type: 'WEB' }[] = [];
  let webProvider: 'tavily' | 'brave' | 'none' = 'none';

  if (enableWeb) {
    const webQuery = buildCinemaWebQuery({
      userText: lastUser,
      personOrFilm,
      festival,
      production,
    });
    const web = await searchWeb({ query: webQuery, maxResults: 6 });
    webProvider = web.provider;
    webCitations = webHitsToCitations(web.hits);
    webHitsBlock = formatWebHitsForPrompt(web.hits);
    console.info('[film-chat] web-search', {
      provider: web.provider,
      hits: web.hits.length,
      query: web.query.slice(0, 140),
    });
  }

  const contextWithWeb = webHitsBlock
    ? `${context}\n\nRÉSULTATS WEB (${webProvider}, à confirmer) :\n${webHitsBlock}`
    : context;

  const system = buildFilmSystemPrompt(locale, contextWithWeb, enableWeb);
  const modelId = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  let message = '';
  let provider = 'kb';

  if (process.env.OPENROUTER_API_KEY) {
    const callOpenRouter = async (maxTokens: number) => {
      const payload: Record<string, unknown> = {
        model: modelId,
        temperature: 0.4,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: lastUser },
        ],
      };
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER || 'https://webmintoul.local',
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

    let maxTok = Math.min(CHAT_MAX_OUTPUT_TOKENS, personOrFilm ? 3_200 : 2_800);
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
      });
      if (isCreditOrTokenError(res.status, rawMsg)) {
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
      message = kbOnlyFallback(locale, context);
      provider = 'kb-fallback';
    } else {
      message = data?.choices?.[0]?.message?.content?.trim() || '';
      if (!message) {
        message = kbOnlyFallback(locale, context);
        provider = 'kb-fallback';
      } else {
        provider = 'openrouter';
      }
    }
  } else if (process.env.GEMINI_API_KEY) {
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
      message = kbOnlyFallback(locale, context);
      provider = 'kb-fallback';
    }
  } else {
    message = kbOnlyFallback(locale, context);
    provider = 'kb';
  }

  const prepared = prepareAiMarkdown(message);
  message = prepared.markdown;

  const ui_sources = (() => {
    const seen = new Set<string>();
    const out: { title: string; url: string; type: 'WEB' | 'KB' }[] = [];
    for (const s of [
      ...webCitations,
      ...prepared.sources.map((x) => ({ ...x, type: 'WEB' as const })),
    ]) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
    return out;
  })();

  return NextResponse.json({
    conversation_id: conversationId,
    role: 'assistant',
    message,
    text: message,
    provider,
    response_type: 'SIMPLE_ANSWER',
    ui_sources,
    places: [],
  });
}
