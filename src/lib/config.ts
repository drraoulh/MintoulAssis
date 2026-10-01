/** Public API + WebSocket URL helpers for SmartMboa Tour (Next.js). */

/**
 * REST API base URL.
 * - Prefer `NEXT_PUBLIC_API_URL` (set in production / .env.local).
 * - Dev fallback: local FastAPI.
 * - Production fallback without env: existing Render API (never invent domains).
 */
export function getApiBaseUrl(): string {
  // In the browser, stay on the current origin to avoid apex-to-www 308 redirects that drop POST bodies
  if (typeof window !== 'undefined') {
    const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    if (fromEnv && !fromEnv.includes('smartmboatour.com')) return fromEnv;
    return '';
  }
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  // Same-origin Next.js API (Supabase + OpenRouter/Gemini)
  return '';
}

/** @deprecated Prefer getApiBaseUrl(); kept for clarity at call sites. */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Canonical public site URL (SEO, sitemap, Open Graph).
 * Prefer NEXT_PUBLIC_SITE_URL; else Vercel production host; else smartmboatour.com.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith('http') ? vercel.replace(/\/$/, '') : `https://${vercel.replace(/\/$/, '')}`;
  }
  return 'https://smartmboatour.com';
}

/**
 * Voice WebSocket URL derived from the HTTP API base.
 * https → wss, http → ws. Never use ws:// on an HTTPS page.
 */
export function getVoiceWebSocketUrl(): string {
  const http = getApiBaseUrl().replace(/\/$/, '');
  let wsRoot: string;
  if (http.startsWith('https://')) {
    wsRoot = `wss://${http.slice('https://'.length)}`;
  } else if (http.startsWith('http://')) {
    wsRoot = `ws://${http.slice('http://'.length)}`;
  } else {
    wsRoot = http;
  }
  return `${wsRoot}/api/voice/session`;
}

export const APP_NAME = 'SmartMboa';
export const APP_TAGLINE_FR = 'Votre guide intelligent pour découvrir le Cameroun';
export const APP_TAGLINE_EN = 'Your intelligent guide to discover Cameroon';

/** SEO-oriented long description (FR). */
export const APP_DESCRIPTION_FR =
  'SmartMboa est le guide touristique intelligent du Cameroun : explorez les régions, découvrez les sites, planifiez un itinéraire, et discutez avec l’assistant vocal et Vision IA.';

export const APP_KEYWORDS = [
  'Cameroun',
  'tourisme Cameroun',
  'guide touristique',
  'SmartMboa',
  'Mintoul',
  'itinéraires Cameroun',
  'Kribi',
  'Limbé',
  'Yaoundé',
  'Douala',
  'parcs nationaux',
  'assistant vocal',
  'voyage Cameroun',
] as const;

export const HEALTH_PROBE_TIMEOUT_MS = 20_000;
export const REQUEST_TIMEOUT_MS = 180_000;
export const KEEP_ALIVE_MS = 3 * 60 * 1000;
