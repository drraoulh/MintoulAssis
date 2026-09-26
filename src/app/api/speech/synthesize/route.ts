import { NextResponse } from 'next/server';

import { fishApiKey, synthesizeWithFishAudio, ttsProvider } from '@/lib/speech/fish-tts';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = {
  text?: string;
  locale?: string;
};

/**
 * Server TTS via Fish Audio when TTS_PROVIDER=fish.
 * Client falls back to browser speechSynthesis on error.
 */
export async function POST(req: Request) {
  if (ttsProvider() === 'none' || ttsProvider() === 'browser') {
    return NextResponse.json(
      { detail: 'Synthèse serveur désactivée (TTS_PROVIDER).' },
      { status: 501 },
    );
  }

  if (!fishApiKey()) {
    return NextResponse.json(
      {
        detail:
          'FISH_AUDIO_API_KEY manquante. La lecture navigateur reste disponible.',
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const text = (body?.text || '').trim();
    if (!text) {
      return NextResponse.json({ detail: 'Texte manquant.' }, { status: 400 });
    }

    const result = await synthesizeWithFishAudio(text, {
      locale: body?.locale,
      signal: req.signal,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': result.mime,
        'Cache-Control': 'no-store',
        'X-TTS-Provider': result.provider,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur TTS';
    console.error('[speech/synthesize]', msg.slice(0, 300));
    return NextResponse.json(
      { detail: 'Synthèse vocale indisponible. Lecture navigateur en secours.' },
      { status: 502 },
    );
  }
}
