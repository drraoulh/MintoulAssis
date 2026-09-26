import { NextResponse } from 'next/server';

import { analyzeImage } from '@/lib/vision/analyze';
import { assertVisionImage, blobToDataUrl } from '@/lib/vision/guide';
import { openRouterApiKey } from '@/lib/vision/openrouter';

export const runtime = 'nodejs';
export const maxDuration = 45;

/**
 * Backward-compatible identify endpoint (analyze only).
 * Prefer POST /api/vision/guide for the full pipeline.
 */
export async function POST(req: Request) {
  if (!openRouterApiKey()) {
    return NextResponse.json(
      { detail: 'OPENROUTER_API_KEY manquante pour Vision.' },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const locale = String(form.get('locale') || 'fr');
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ detail: 'Aucune image reçue.' }, { status: 400 });
    }
    assertVisionImage(file, file instanceof File ? file.name : undefined);
    const dataUrl = await blobToDataUrl(file);
    const analysis = await analyzeImage({ dataUrl, locale });
    return NextResponse.json({
      description: analysis.short_description,
      provider: 'openrouter',
      analysis,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Vision.';
    return NextResponse.json({ detail: msg }, { status: 502 });
  }
}
