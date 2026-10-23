/**
 * Identifies the current server run so the client can start fresh (intro animation,
 * section choice) after a restart. Must be identical for prerendered and dynamic pages
 * of the same run, otherwise users would be reset on every navigation.
 */

const g = globalThis as typeof globalThis & { __smartmboaBootId?: string };

function computeBootId(): string {
  if (process.env.NODE_ENV === 'development') {
    // One id per dev-server process — survives hot reloads, changes on restart
    g.__smartmboaBootId ??= `dev-${process.pid}-${Date.now()}`;
    return g.__smartmboaBootId;
  }
  // Available at build and at runtime on Vercel → same value for static and dynamic pages
  return process.env.VERCEL_GIT_COMMIT_SHA || 'prod';
}

export const BOOT_ID = computeBootId();

/** localStorage keys that make up "the user has already been through the intro". */
export const FRESH_START_KEYS = [
  'smartmboa_intro_seen',
  'smartmboa_entry_mode',
  'smartmboa_film_audience',
] as const;

/**
 * Inline script run before first paint:
 * 1. on a new server run, forget intro / section / audience choices and go back home so the
 *    animation plays again;
 * 2. tag <html data-entry> with the remembered section so the home placeholder matches it
 *    (light for tourism, dark for intro / cinema) instead of flashing black.
 */
export function freshStartScript(): string {
  const id = JSON.stringify(BOOT_ID);
  const keys = JSON.stringify(FRESH_START_KEYS);
  return `(function(){try{var ls=localStorage,k='smartmboa_boot_id',id=${id},prev=ls.getItem(k);if(id!=='prod'&&prev!==id){ls.setItem(k,id);if(prev!==null){${keys}.forEach(function(x){ls.removeItem(x)});if(location.pathname!=='/'){location.replace('/');return;}}}var seen=ls.getItem('smartmboa_intro_seen')==='true',mode=ls.getItem('smartmboa_entry_mode');document.documentElement.setAttribute('data-entry',seen&&mode?mode:'intro');}catch(e){}})();`;
}
