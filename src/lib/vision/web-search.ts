import {
  extractJsonObject,
  openRouterChat,
  visionTextModel,
  webSearchEnabled,
} from '@/lib/vision/openrouter';
import type { VisionAnalysis } from '@/lib/vision/analyze';

export type WebSource = {
  title: string;
  url: string;
  snippet: string;
};

/**
 * Web research for Cameroon places only — via OpenRouter web plugin + Gemini.
 * Skipped when OPENROUTER_WEB_SEARCH=0 or place is not Cameroon.
 */
export async function searchCameroonPlaceWeb(params: {
  analysis: VisionAnalysis;
  locale?: string;
  signal?: AbortSignal;
}): Promise<WebSource[]> {
  if (!webSearchEnabled()) return [];
  if (!params.analysis.is_cameroon) return [];

  const locale = params.locale === 'en' ? 'en' : 'fr';
  const place =
    params.analysis.place_name ||
    params.analysis.label ||
    params.analysis.short_description;
  const where = [params.analysis.city, params.analysis.country || 'Cameroun']
    .filter(Boolean)
    .join(', ');

  const queryHint =
    locale === 'en'
      ? `Reliable facts about "${place}" (${where}): history, culture, tourism tips for Cameroon.`
      : `Informations fiables sur « ${place} » (${where}) : histoire, culture, conseils touristiques au Cameroun.`;

  const result = await openRouterChat({
    model: visionTextModel(),
    signal: params.signal,
    temperature: 0.1,
    maxTokens: 1200,
    webSearch: true,
    responseFormatJson: true,
    messages: [
      {
        role: 'system',
        content: `Tu es un documentaliste. Utilise la recherche web. Réponds UNIQUEMENT en JSON :
{"sources":[{"title":"...","url":"https://...","snippet":"..."}]}
- Maximum 6 sources.
- Priorise sources fiables (officiels, presse, encyclopédies, tourisme).
- Ne fabrique pas d'URL. Si aucune source solide, renvoie {"sources":[]}.`,
      },
      {
        role: 'user',
        content: `${queryHint}\n\nContexte image : ${params.analysis.short_description}`,
      },
    ],
  });

  try {
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
