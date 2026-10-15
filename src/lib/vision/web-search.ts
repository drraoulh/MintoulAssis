import {
  extractJsonObject,
  openRouterChat,
  visionTextModel,
} from '@/lib/vision/openrouter';
import type { VisionAnalysis } from '@/lib/vision/analyze';
import { searchWeb, webSearchEnvEnabled } from '@/lib/web-search';

export type WebSource = {
  title: string;
  url: string;
  snippet: string;
};

/**
 * Web research for Cameroon places — Tavily first, Brave fallback.
 * Skipped when web search is disabled or place is not Cameroon.
 */
export async function searchCameroonPlaceWeb(params: {
  analysis: VisionAnalysis;
  locale?: string;
  signal?: AbortSignal;
}): Promise<WebSource[]> {
  if (!webSearchEnvEnabled()) return [];
  if (!params.analysis.is_cameroon) return [];

  const locale = params.locale === 'en' ? 'en' : 'fr';
  const place =
    params.analysis.place_name ||
    params.analysis.label ||
    params.analysis.short_description;
  const where = [params.analysis.city, params.analysis.country || 'Cameroun']
    .filter(Boolean)
    .join(', ');

  const query =
    locale === 'en'
      ? `${place} ${where} Cameroon tourism history culture`
      : `${place} ${where} Cameroun tourisme histoire culture`;

  const web = await searchWeb({
    query,
    maxResults: 6,
    signal: params.signal,
  });

  if (web.hits.length) {
    return web.hits.map((h) => ({
      title: h.title,
      url: h.url,
      snippet: h.snippet,
    }));
  }

  // Last resort: ask the LLM to structure empty (no OpenRouter web plugin).
  if (!process.env.OPENROUTER_API_KEY) return [];

  const queryHint =
    locale === 'en'
      ? `Reliable facts about "${place}" (${where}): history, culture, tourism tips for Cameroon.`
      : `Informations fiables sur « ${place} » (${where}) : histoire, culture, conseils touristiques au Cameroun.`;

  try {
    const result = await openRouterChat({
      model: visionTextModel(),
      signal: params.signal,
      temperature: 0.1,
      maxTokens: 800,
      webSearch: false,
      responseFormatJson: true,
      messages: [
        {
          role: 'system',
          content: `Tu es un documentaliste. Réponds UNIQUEMENT en JSON :
{"sources":[{"title":"...","url":"https://...","snippet":"..."}]}
- Maximum 6 sources.
- Ne fabrique pas d'URL. Si aucune source solide, renvoie {"sources":[]}.`,
        },
        {
          role: 'user',
          content: `${queryHint}\n\nContexte image : ${params.analysis.short_description}`,
        },
      ],
    });

    const parsed = extractJsonObject<{ sources?: WebSource[] }>(result.content);
    const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
    return sources
      .filter((s) => s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url))
      .map((s) => ({
        title: String(s.title || s.url).slice(0, 160),
        url: String(s.url).slice(0, 400),
        snippet: String(s.snippet || '').slice(0, 320),
      }))
      .slice(0, 6);
  } catch {
    return [];
  }
}
