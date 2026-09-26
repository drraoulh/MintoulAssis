/**
 * Fish Audio TTS (S2.1) — natural French/English guide voice.
 * Docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
 */

export function fishApiKey(): string | null {
  return process.env.FISH_AUDIO_API_KEY?.trim() || null;
}

export function ttsProvider(): string {
  return (process.env.TTS_PROVIDER || 'fish').trim().toLowerCase();
}

function fishBaseUrl(): string {
  return (
    process.env.FISH_AUDIO_BASE_URL?.trim().replace(/\/$/, '') ||
    'https://api.fish.audio'
  );
}

function fishModel(): string {
  return process.env.FISH_AUDIO_MODEL?.trim() || 's2.1-pro-free';
}

function fishReferenceId(locale?: string | null): string {
  const lang = (locale || '').toLowerCase();
  if (lang.startsWith('en')) {
    return (
      process.env.FISH_AUDIO_REFERENCE_ID_EN?.trim() ||
      process.env.FISH_AUDIO_REFERENCE_ID?.trim() ||
      ''
    );
  }
  return process.env.FISH_AUDIO_REFERENCE_ID?.trim() || '';
}

export type FishTtsResult = {
  audio: Buffer;
  mime: string;
  provider: 'fish';
};

export async function synthesizeWithFishAudio(
  text: string,
  opts?: { locale?: string | null; signal?: AbortSignal },
): Promise<FishTtsResult> {
  const key = fishApiKey();
  if (!key) {
    throw Object.assign(new Error('FISH_AUDIO_API_KEY manquante'), {
      code: 'NO_FISH_KEY',
      status: 503,
    });
  }

    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      throw Object.assign(new Error('Texte vide pour la synthèse.'), {
        code: 'EMPTY_TEXT',
        status: 400,
      });
    }

    // Strip leftover markdown if the client forgot cleanForSpeech
    const spoken = cleaned
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    const referenceId = fishReferenceId(opts?.locale);
    const timeoutMs = Number(process.env.FISH_AUDIO_TIMEOUT_SECONDS || 45) * 1000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    opts?.signal?.addEventListener('abort', onAbort);

    try {
      const res = await fetch(`${fishBaseUrl()}/v1/tts`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          model: fishModel(),
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: spoken.slice(0, 4000),
          format: 'mp3',
          mp3_bitrate: 128,
          ...(referenceId ? { reference_id: referenceId } : {}),
        }),
      });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw Object.assign(
        new Error(errBody.slice(0, 240) || `Fish Audio TTS ${res.status}`),
        {
          code: res.status === 402 ? 'FISH_CREDITS' : 'FISH_TTS_FAILED',
          status: res.status,
        },
      );
    }

    const ab = await res.arrayBuffer();
    return {
      audio: Buffer.from(ab),
      mime: 'audio/mpeg',
      provider: 'fish',
    };
  } finally {
    clearTimeout(timer);
    opts?.signal?.removeEventListener('abort', onAbort);
  }
}
