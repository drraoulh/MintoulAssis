import { openRouterChat, visionTextModel } from '@/lib/vision/openrouter';
import type { VisionAnalysis } from '@/lib/vision/analyze';
import type { WebSource } from '@/lib/vision/web-search';

export type VisionNarrative = {
  message: string;
  model: string;
};

/**
 * Turn analysis (+ optional web sources) into a tourist-guide answer.
 * Never invents a Cameroon story for foreign places.
 */
export async function narrateVisionGuide(params: {
  analysis: VisionAnalysis;
  sources: WebSource[];
  locale?: string;
  userNote?: string | null;
  signal?: AbortSignal;
}): Promise<VisionNarrative> {
  const locale = params.locale === 'en' ? 'en' : 'fr';
  const sourcesBlock =
    params.sources.length > 0
      ? params.sources
          .map((s, i) => `${i + 1}. ${s.title}\n   ${s.url}\n   ${s.snippet}`)
          .join('\n')
      : '(aucune source web)';

  const system =
    locale === 'en'
      ? `You are SmartMboa, a tourism assistant.
Write a clear, natural reply for a traveler.
Rules:
- If the place is NOT in Cameroon, describe it honestly and do NOT invent Cameroon history/culture.
- If it IS in Cameroon, use the web sources when present; do not invent facts not supported by sources or the visual analysis.
- Structure: identification, short context, visitor tips (if useful), then list sources as markdown links if any.
- Language: English.`
      : `Tu es SmartMboa, assistant touristique.
Rédige une réponse claire et naturelle pour un voyageur.
Règles :
- Si le lieu N'EST PAS au Cameroun : décris-le honnêtement, SANS inventer d'histoire/culture camerounaise.
- S'il EST au Cameroun : appuie-toi sur les sources web fournies ; n'invente pas de faits absents des sources / de l'analyse visuelle.
- Structure : identification, contexte court, conseils visite (si utile), puis sources en liens markdown s'il y en a.
- Langue : français.`;

  const user = [
    `Analyse visuelle :`,
    `- label: ${params.analysis.label}`,
    `- lieu: ${params.analysis.place_name ?? '—'}`,
    `- ville: ${params.analysis.city ?? '—'}`,
    `- pays: ${params.analysis.country ?? '—'}`,
    `- cameroun: ${params.analysis.is_cameroon ? 'oui' : 'non'}`,
    `- confiance: ${params.analysis.confidence.toFixed(2)}`,
    `- description: ${params.analysis.short_description}`,
    params.userNote ? `- précision utilisateur: ${params.userNote}` : null,
    ``,
    `Sources web :`,
    sourcesBlock,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const result = await openRouterChat({
    model: visionTextModel(),
    signal: params.signal,
    temperature: 0.35,
    maxTokens: 1400,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  return { message: result.content, model: result.model };
}
