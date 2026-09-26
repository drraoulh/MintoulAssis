/**
 * OpenRouter audio STT (chat input_audio or /audio/transcriptions).
 * Often requires a minimum credit balance for audio modality.
 */

export type OpenRouterAsrResult = {
  text: string;
  provider: 'openrouter';
};

function openRouterKey(): string | null {
  return process.env.OPENROUTER_API_KEY?.trim() || null;
}

export async function transcribeWithOpenRouter(
  b64: string,
  format: string,
  signal?: AbortSignal,
): Promise<OpenRouterAsrResult> {
  const key = openRouterKey();
  if (!key) {
    throw Object.assign(new Error('OPENROUTER_API_KEY manquante'), {
      code: 'NO_OR_KEY',
      status: 503,
    });
  }

  const model =
    process.env.OPENROUTER_SPEECH_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'google/gemini-2.5-flash';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://webmintoul.local',
      'X-Title': 'SmartMboa Speech STT',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcris fidèlement cet audio en texte. Réponds UNIQUEMENT avec la transcription, sans guillemets ni commentaire. Si l’audio est vide ou inaudible, réponds exactement : (inaudible)',
            },
            {
              type: 'input_audio',
              input_audio: { data: b64, format },
            },
          ],
        },
      ],
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string; code?: number };
  } | null;

  if (!res.ok) {
    const raw = data?.error?.message || `OpenRouter STT ${res.status}`;
    throw Object.assign(new Error(raw), {
      code: res.status === 402 ? 'OR_CREDITS' : 'OR_ASR_FAILED',
      status: res.status,
    });
  }

  let text = (data?.choices?.[0]?.message?.content || '').trim();
  text = text.replace(/^["«]|["»]$/g, '').trim();
  return { text, provider: 'openrouter' };
}
