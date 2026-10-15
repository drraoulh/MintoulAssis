/**
 * Shared OpenRouter helpers for SmartMboa Vision.
 * Default model: google/gemini-2.5-flash
 */

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function openRouterApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key || null;
}

/** Text / chat model used by Vision narrate + web enrichment. */
export function visionTextModel(): string {
  return (
    process.env.OPENROUTER_VISION_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'google/gemini-2.5-flash'
  );
}

/** Multimodal model for image analysis. */
export function visionImageModel(): string {
  return (
    process.env.OPENROUTER_VISION_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'google/gemini-2.5-flash'
  );
}

export function visionConfidenceThreshold(): number {
  const n = Number(process.env.VISION_CONFIDENCE_THRESHOLD ?? 0.55);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.55;
}

export function visionMaxImageBytes(): number {
  const n = Number(process.env.VISION_MAX_IMAGE_BYTES ?? 5_000_000);
  return Number.isFinite(n) ? n : 5_000_000;
}

export function visionTimeoutMs(): number {
  const n = Number(process.env.VISION_TIMEOUT_MS ?? 45_000);
  return Number.isFinite(n) ? n : 45_000;
}

export function webSearchEnabled(): boolean {
  const raw = process.env.OPENROUTER_WEB_SEARCH?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return true;
}

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
    };

export type OpenRouterChatOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Enable OpenRouter web plugin. */
  webSearch?: boolean;
  signal?: AbortSignal;
  responseFormatJson?: boolean;
};

export type OpenRouterChatResult = {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export async function openRouterChat(
  opts: OpenRouterChatOptions,
): Promise<OpenRouterChatResult> {
  const key = openRouterApiKey();
  if (!key) {
    throw new Error('OPENROUTER_API_KEY manquante. Ajoute-la dans .env.local.');
  }

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
  };

  if (opts.responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  if (opts.webSearch && webSearchEnabled()) {
    body.plugins = [{ id: 'web', max_results: 6 }];
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://smartmboa.local',
      'X-Title': 'SmartMboa Vision',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null } }[];
    model?: string;
    usage?: OpenRouterChatResult['usage'];
    error?: { message?: string; code?: string };
  } | null;

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      (res.status === 429
        ? 'Quota OpenRouter atteint. Réessaie dans un moment.'
        : `OpenRouter indisponible (${res.status}).`);
    throw new Error(msg);
  }

  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!content) {
    throw new Error('Réponse vide du modèle Vision.');
  }

  return {
    content,
    model: data?.model || opts.model,
    usage: data?.usage,
  };
}

/** Extract first JSON object from a model reply (tolerates markdown fences). */
export function extractJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() || trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('JSON Vision introuvable dans la réponse du modèle.');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'Opération',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} : délai dépassé (${ms} ms).`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
