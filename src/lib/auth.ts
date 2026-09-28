export const SESSION_COOKIE = 'smartmboa_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function credentials() {
  return {
    username: process.env.AUTH_USERNAME || 'hyacinthe',
    password: process.env.AUTH_PASSWORD || 'SmartMboa',
  };
}

function secret() {
  const { username, password } = credentials();
  return process.env.AUTH_SECRET || `smartmboa:${username}:${password}`;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCredentials(username: string, password: string) {
  const expected = credentials();
  return (
    timingSafeEqual(username.trim().toLowerCase(), expected.username.toLowerCase()) &&
    timingSafeEqual(password, expected.password)
  );
}

export async function createSessionToken() {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`session:${credentials().username}`),
  );
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isValidSession(token: string | undefined) {
  if (!token) return false;
  return timingSafeEqual(token, await createSessionToken());
}
