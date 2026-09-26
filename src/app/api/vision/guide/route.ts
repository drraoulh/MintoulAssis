import { NextResponse } from 'next/server';

import { openRouterApiKey } from '@/lib/vision/openrouter';
import { runVisionGuide } from '@/lib/vision/guide';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Very light in-memory rate limit (per instance). */
const hits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function clientKey(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now > row.reset) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (row.count >= MAX_PER_WINDOW) return false;
  row.count += 1;
  return true;
}

export async function POST(req: Request) {
  if (!openRouterApiKey()) {
    return NextResponse.json(
      {
        detail:
          'OPENROUTER_API_KEY manquante. Ajoute-la dans .env.local pour activer Vision (google/gemini-2.5-flash).',
      },
      { status: 503 },
    );
  }

  if (!rateLimit(clientKey(req))) {
    return NextResponse.json(
      { detail: 'Trop de analyses Vision. Attendez une minute puis réessayez.' },
      { status: 429 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const locale = String(form.get('locale') || 'fr');
    const userNoteRaw = form.get('user_note');
    const userNote =
      typeof userNoteRaw === 'string' && userNoteRaw.trim() ? userNoteRaw.trim() : null;

    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { detail: 'Aucune image reçue. Prenez une photo ou importez un fichier.' },
        { status: 400 },
      );
    }

    const filename =
      file instanceof File && file.name ? file.name : 'photo.jpg';

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    req.signal.addEventListener('abort', onAbort);

    try {
      const result = await runVisionGuide({
        file,
        filename,
        locale,
        userNote,
        signal: controller.signal,
      });

      return NextResponse.json({
        status: result.status,
        description: result.analysis?.short_description ?? null,
        analysis: result.analysis,
        sources: result.sources,
        message: result.message,
        clarifying_question: result.clarifying_question,
        provider: result.provider,
        model: result.model,
        matched_place_hint: result.matched_place_hint,
        confidence: result.analysis?.confidence ?? null,
        is_cameroon: result.analysis?.is_cameroon ?? null,
      });
    } finally {
      req.signal.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Vision inconnue.';
    const status =
      /trop lourde|non supporté|Aucune image/i.test(msg)
        ? 400
        : /Quota|429/i.test(msg)
          ? 429
          : /délai|timeout|Abort/i.test(msg)
            ? 504
            : 502;
    return NextResponse.json({ detail: msg }, { status });
  }
}
