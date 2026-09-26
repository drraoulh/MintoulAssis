import {
  getApiBaseUrl,
  HEALTH_PROBE_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
} from '../config';
import { readStoredLocale, translate } from '../i18n-dict';
import type {
  ChatRequest,
  ChatResponse,
  ConversationHistoryResponse,
  ConversationListResponse,
  HealthResponse,
  TouristSite,
  TouristSiteListResponse,
  VisionGuideResponse,
  VisionIdentifyResponse,
} from '../types';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function readErrorDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  return null;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      readErrorDetail(payload) ?? `HTTP ${response.status}`,
      response.status,
    );
  }
  return payload as T;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    return await parseJsonResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(translate(readStoredLocale(), 'error.timeout'), 504);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchHealth(
  timeoutMs: number = HEALTH_PROBE_TIMEOUT_MS,
): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health', undefined, timeoutMs);
}

export function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listConversations(limit = 30): Promise<ConversationListResponse> {
  return request<ConversationListResponse>(`/api/conversations?limit=${limit}`);
}

export function fetchConversation(
  conversationId: string,
): Promise<ConversationHistoryResponse> {
  return request<ConversationHistoryResponse>(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
  );
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const id = conversationId.trim().replace(/\/+$/, '');
  if (!id) throw new ApiError('Conversation invalide.', 400);
  await request<unknown>(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function listTouristSites(params?: {
  city?: string;
  region?: string;
  category?: string;
  q?: string;
  limit?: number;
  withCounts?: boolean;
}): Promise<TouristSiteListResponse> {
  const q = new URLSearchParams();
  if (params?.city) q.set('city', params.city);
  if (params?.region) q.set('region', params.region);
  if (params?.category) q.set('category', params.category);
  if (params?.q) q.set('q', params.q);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.withCounts) q.set('with_counts', '1');
  const qs = q.toString();
  return request<TouristSiteListResponse>(
    `/api/tourist-sites${qs ? `?${qs}` : ''}`,
  );
}

export function fetchTouristSite(siteId: string): Promise<TouristSite> {
  return request<TouristSite>(`/api/tourist-sites/${encodeURIComponent(siteId)}`);
}

export function nearbyTouristSites(params: {
  city?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
}): Promise<TouristSiteListResponse> {
  const q = new URLSearchParams();
  if (params.city) q.set('city', params.city);
  if (params.latitude != null) q.set('latitude', String(params.latitude));
  if (params.longitude != null) q.set('longitude', String(params.longitude));
  if (params.radius_km != null) q.set('radius_km', String(params.radius_km));
  return request<TouristSiteListResponse>(`/api/tourist-sites/nearby?${q}`);
}

export async function identifyImage(file: File): Promise<VisionIdentifyResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    const response = await fetch(`${getApiBaseUrl()}/api/vision/identify`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      body: form,
    });
    return await parseJsonResponse<VisionIdentifyResponse>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(translate(readStoredLocale(), 'error.timeout'), 504);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Full Vision pipeline: analyze → web search (if Cameroon) → guide answer. */
export async function runVisionGuide(
  file: File,
  opts?: { locale?: string; userNote?: string | null; signal?: AbortSignal },
): Promise<VisionGuideResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  opts?.signal?.addEventListener('abort', onExternalAbort);
  try {
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    if (opts?.locale) form.append('locale', opts.locale);
    if (opts?.userNote?.trim()) form.append('user_note', opts.userNote.trim());
    const response = await fetch(`${getApiBaseUrl()}/api/vision/guide`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      body: form,
    });
    return await parseJsonResponse<VisionGuideResponse>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(translate(readStoredLocale(), 'error.timeout'), 504);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    opts?.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function synthesizeSpeech(
  text: string,
  opts?: { signal?: AbortSignal; locale?: string },
): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  opts?.signal?.addEventListener('abort', onExternalAbort);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/speech/synthesize`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        locale: opts?.locale || readStoredLocale(),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(
        readErrorDetail(payload) ?? `HTTP ${response.status}`,
        response.status,
      );
    }
    return await response.blob();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(translate(readStoredLocale(), 'error.ttsTimeout'), 504);
    }
    throw new ApiError(
      'La synthèse vocale a été interrompue. Réessayez ou utilisez le haut-parleur du navigateur.',
      0,
    );
  } finally {
    clearTimeout(timeoutId);
    opts?.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/** STT — upload recorded audio to `/api/speech/transcribe`. */
export async function transcribeAudio(
  blob: Blob,
  opts?: { mimeType?: string; filename?: string; signal?: AbortSignal },
): Promise<{ text: string; language?: string | null }> {
  const mime =
    opts?.mimeType ||
    blob.type?.split(';')[0] ||
    'audio/wav';
  const ext =
    mime.includes('wav')
      ? 'wav'
      : mime.includes('mp3') || mime.includes('mpeg')
        ? 'mp3'
        : mime.includes('ogg')
          ? 'ogg'
          : mime.includes('mp4') || mime.includes('m4a')
            ? 'm4a'
            : 'wav';
  const filename = opts?.filename || `recording.${ext}`;
  const file =
    blob.type === mime
      ? blob
      : new Blob([blob], { type: mime });
  const body = new FormData();
  body.append('file', file, filename);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  opts?.signal?.addEventListener('abort', onExternalAbort);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/speech/transcribe`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      body,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(
        readErrorDetail(payload) ?? `HTTP ${response.status}`,
        response.status,
      );
    }
    const payload = (await response.json()) as {
      text?: string;
      language?: string | null;
    };
    return {
      text: (payload.text || '').trim(),
      language: payload.language,
    };
  } finally {
    clearTimeout(timeoutId);
    opts?.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export function friendlyError(error: unknown): string {
  const locale = readStoredLocale();
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return locale === 'en'
        ? 'Voice service is missing on the server. Please refresh or use text chat.'
        : 'Service vocal introuvable sur le serveur. Actualisez la page ou utilisez le chat texte.';
    }
    if (error.status === 402) {
      return (
        error.message?.trim() ||
        (locale === 'en'
          ? 'Speech credits exhausted. Add HUGGINGFACE_API_KEY or use Chrome.'
          : 'Crédit audio insuffisant. Ajoutez HUGGINGFACE_API_KEY ou utilisez Chrome.')
      );
    }
    if (error.status === 501) {
      return error.message || translate(locale, 'error.generic');
    }
    if (error.status >= 500 || error.status === 0) {
      return error.message?.trim() || translate(locale, 'error.generic');
    }
    return error.message || translate(locale, 'error.generic');
  }
  if (
    error instanceof Error &&
    /failed to fetch|network|connection.?closed|err_connection/i.test(error.message)
  ) {
    return translate(locale, 'error.network');
  }
  return error instanceof Error && error.message.trim()
    ? error.message
    : translate(locale, 'error.generic');
}
