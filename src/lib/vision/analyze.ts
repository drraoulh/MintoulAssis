import {
  extractJsonObject,
  openRouterChat,
  visionConfidenceThreshold,
  visionImageModel,
} from '@/lib/vision/openrouter';

export type VisionAnalysis = {
  label: string;
  place_name: string | null;
  country: string | null;
  city: string | null;
  is_cameroon: boolean;
  confidence: number;
  landmarks: string[];
  needs_clarification: boolean;
  clarifying_question: string | null;
  short_description: string;
};

const ANALYZE_SYSTEM = `Tu es un expert en reconnaissance visuelle pour un guide touristique du Cameroun (SmartMboa / MINTOUL).
Analyse l'image et réponds UNIQUEMENT en JSON valide (pas de markdown) avec exactement ces clés :
{
  "label": "courte étiquette de ce qui est vu",
  "place_name": "nom du lieu si identifiable sinon null",
  "country": "pays probable sinon null",
  "city": "ville probable sinon null",
  "is_cameroon": true/false,
  "confidence": 0.0 à 1.0,
  "landmarks": ["éléments visibles"],
  "needs_clarification": true/false,
  "clarifying_question": "question FR à poser si needs_clarification sinon null",
  "short_description": "1-3 phrases décrivant l'image"
}
Règles :
- Ne force JAMAIS le Cameroun. Si c'est ailleurs, is_cameroon=false.
- Si tu n'es pas sûr du lieu (confidence faible ou plusieurs possibilités), needs_clarification=true.
- confidence < 0.55 ⇒ needs_clarification=true.`;

export async function analyzeImage(params: {
  dataUrl: string;
  locale?: string;
  signal?: AbortSignal;
}): Promise<VisionAnalysis> {
  const locale = params.locale === 'en' ? 'en' : 'fr';
  const userText =
    locale === 'en'
      ? 'Identify what is in this photo. Prefer honest uncertainty over inventing a Cameroon place.'
      : 'Identifie ce qui apparaît sur cette photo. Préfère l’incertitude honnête à inventer un lieu camerounais.';

  const result = await openRouterChat({
    model: visionImageModel(),
    signal: params.signal,
    temperature: 0.1,
    maxTokens: 900,
    responseFormatJson: true,
    messages: [
      { role: 'system', content: ANALYZE_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: params.dataUrl } },
        ],
      },
    ],
  });

  const parsed = extractJsonObject<Partial<VisionAnalysis>>(result.content);
  const confidence = clamp01(Number(parsed.confidence ?? 0));
  const threshold = visionConfidenceThreshold();
  const needs =
    Boolean(parsed.needs_clarification) ||
    confidence < threshold ||
    (!parsed.place_name && confidence < 0.7);

  return {
    label: String(parsed.label || 'Élément non identifié').slice(0, 120),
    place_name: parsed.place_name ? String(parsed.place_name).slice(0, 160) : null,
    country: parsed.country ? String(parsed.country).slice(0, 80) : null,
    city: parsed.city ? String(parsed.city).slice(0, 80) : null,
    is_cameroon: Boolean(parsed.is_cameroon),
    confidence,
    landmarks: Array.isArray(parsed.landmarks)
      ? parsed.landmarks.map((x) => String(x)).slice(0, 8)
      : [],
    needs_clarification: needs,
    clarifying_question: needs
      ? String(
          parsed.clarifying_question ||
            (locale === 'en'
              ? 'Can you tell me the city or region where this photo was taken?'
              : 'Pouvez-vous préciser la ville ou la région où cette photo a été prise ?'),
        ).slice(0, 240)
      : null,
    short_description: String(parsed.short_description || parsed.label || '').slice(0, 600),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
