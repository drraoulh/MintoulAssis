import type { VisionAnalysis } from '@/lib/vision/analyze';
import type { WebSource } from '@/lib/vision/web-search';
import { analyzeImage } from '@/lib/vision/analyze';
import { searchCameroonPlaceWeb } from '@/lib/vision/web-search';
import { narrateVisionGuide } from '@/lib/vision/narrate';
import {
  visionMaxImageBytes,
  visionTimeoutMs,
  withTimeout,
} from '@/lib/vision/openrouter';

export type VisionGuideStatus =
  | 'ok'
  | 'needs_clarification'
  | 'error';

export type VisionGuideResult = {
  status: VisionGuideStatus;
  analysis: VisionAnalysis | null;
  sources: WebSource[];
  message: string | null;
  clarifying_question: string | null;
  provider: string;
  model: string | null;
  matched_place_hint: string | null;
};

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function assertVisionImage(file: File | Blob, filename?: string): void {
  const type = (file.type || guessMime(filename) || '').toLowerCase();
  if (type && !ALLOWED_MIME.has(type) && !type.startsWith('image/')) {
    throw new Error('Format d’image non supporté. Utilisez JPG, PNG ou WebP.');
  }
  const max = visionMaxImageBytes();
  if (typeof file.size === 'number' && file.size > max) {
    throw new Error(
      `Image trop lourde (${Math.round(file.size / 1e6)} Mo). Limite : ${Math.round(max / 1e6)} Mo.`,
    );
  }
}

function guessMime(name?: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = Buffer.from(await blob.arrayBuffer());
  const mime = blob.type || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Full Vision pipeline: analyze → (optional web search) → narrate.
 * Responsibilities stay in separate modules; this only orchestrates.
 */
export async function runVisionGuide(params: {
  file: Blob;
  filename?: string;
  locale?: string;
  userNote?: string | null;
  signal?: AbortSignal;
}): Promise<VisionGuideResult> {
  assertVisionImage(params.file, params.filename);
  const budget = visionTimeoutMs();
  const started = Date.now();
  const remaining = () => Math.max(3_000, budget - (Date.now() - started));

  const dataUrl = await blobToDataUrl(params.file);

  const analysis = await withTimeout(
    analyzeImage({
      dataUrl,
      locale: params.locale,
      signal: params.signal,
    }),
    Math.min(remaining(), 28_000),
    'Analyse image',
  );

  if (analysis.needs_clarification && !params.userNote?.trim()) {
    return {
      status: 'needs_clarification',
      analysis,
      sources: [],
      message: null,
      clarifying_question: analysis.clarifying_question,
      provider: 'openrouter',
      model: null,
      matched_place_hint: analysis.place_name,
    };
  }

  // If user provided a note after clarification, merge lightly into description.
  const enriched: VisionAnalysis = params.userNote?.trim()
    ? {
        ...analysis,
        needs_clarification: false,
        clarifying_question: null,
        short_description: `${analysis.short_description} (précision : ${params.userNote.trim()})`,
        // Allow Cameroon if user situates it there
        is_cameroon:
          analysis.is_cameroon ||
          /cameroun|cameroon|yaoundé|yaounde|douala|kribi|limbe|bafoussam|garoua|maroua/i.test(
            params.userNote,
          ),
      }
    : analysis;

  let sources: WebSource[] = [];
  if (enriched.is_cameroon) {
    try {
      sources = await withTimeout(
        searchCameroonPlaceWeb({
          analysis: enriched,
          locale: params.locale,
          signal: params.signal,
        }),
        Math.min(remaining(), 20_000),
        'Recherche web',
      );
    } catch {
      sources = [];
    }
  }

  const narrative = await withTimeout(
    narrateVisionGuide({
      analysis: enriched,
      sources,
      locale: params.locale,
      userNote: params.userNote,
      signal: params.signal,
    }),
    Math.min(remaining(), 22_000),
    'Génération guide',
  );

  return {
    status: 'ok',
    analysis: enriched,
    sources,
    message: narrative.message,
    clarifying_question: null,
    provider: 'openrouter',
    model: narrative.model,
    matched_place_hint: enriched.place_name,
  };
}
