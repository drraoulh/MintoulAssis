/**
 * Hugging Face Inference Providers — Automatic Speech Recognition (Whisper).
 * Docs: https://huggingface.co/docs/inference-providers/en/tasks/automatic-speech-recognition
 */

export function hfApiKey(): string | null {
  return (
    process.env.HUGGINGFACE_HUB_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim() ||
    process.env.HF_API_TOKEN?.trim() ||
    null
  );
}

export function hfAsrModel(): string {
  return (
    process.env.HF_WHISPER_MODEL_ID?.trim() ||
    process.env.HF_ASR_MODEL?.trim() ||
    process.env.HF_WHISPER_MODEL?.trim() ||
    'openai/whisper-large-v3-turbo'
  );
}

export function hfInferenceBaseUrl(): string {
  return (
    process.env.HF_INFERENCE_BASE_URL?.trim().replace(/\/$/, '') ||
    'https://router.huggingface.co/hf-inference'
  );
}

export function speechProvider(): string {
  return (process.env.SPEECH_PROVIDER || 'huggingface').trim().toLowerCase();
}

export type AsrResult = { text: string; provider: 'huggingface' | 'openrouter' };

/**
 * POST raw audio bytes to HF router ASR endpoint.
 * Accepts wav/flac/mp3/webm depending on provider.
 */
export async function transcribeWithHuggingFace(
  audio: Buffer,
  mime: string,
  signal?: AbortSignal,
): Promise<AsrResult> {
  const key = hfApiKey();
  if (!key) {
    throw Object.assign(
      new Error('HUGGINGFACE_HUB_TOKEN / HUGGINGFACE_API_KEY manquante'),
      { code: 'NO_HF_KEY', status: 503 },
    );
  }

  const model = hfAsrModel();
  const url = `${hfInferenceBaseUrl()}/models/${encodeURIComponent(model)}`;
  const timeoutMs = Number(process.env.HF_SPEECH_TIMEOUT_SECONDS || 120) * 1000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': mime || 'audio/wav',
        Accept: 'application/json',
      },
      body: new Uint8Array(audio),
    });

    const rawText = await res.text();
    let data: unknown = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      let msg = `HF ASR ${res.status}`;
      if (
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
      ) {
        msg = (data as { error: string }).error;
      } else if (rawText.trim()) {
        msg = rawText.slice(0, 300);
      }

      if (res.status === 503 || /loading|currently loading/i.test(msg)) {
        throw Object.assign(
          new Error(
            'Modèle Whisper en cours de démarrage. Réessayez dans quelques secondes.',
          ),
          { code: 'HF_LOADING', status: 503 },
        );
      }

      throw Object.assign(new Error(msg), {
        code: 'HF_ASR_FAILED',
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
      });
    }

    let text = '';
    if (data && typeof data === 'object') {
      if ('text' in data && typeof (data as { text: unknown }).text === 'string') {
        text = (data as { text: string }).text;
      } else if (
        Array.isArray(data) &&
        data[0] &&
        typeof data[0] === 'object' &&
        'text' in data[0]
      ) {
        text = String((data[0] as { text: unknown }).text || '');
      }
    } else if (typeof data === 'string') {
      text = data;
    }

    return { text: text.trim(), provider: 'huggingface' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
