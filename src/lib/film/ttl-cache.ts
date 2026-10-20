/**
 * Tiny in-memory TTL cache shared across requests of the same server instance.
 * Concurrent callers for the same key share one in-flight promise.
 */

type Entry<T> = { value: Promise<T>; expires: number };

const MAX_ENTRIES = 500;

export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, Entry<T>>();

  return async function cached(key: string, load: () => Promise<T>): Promise<T> {
    const k = key.trim().toLowerCase();
    const now = Date.now();
    const hit = store.get(k);
    if (hit && hit.expires > now) return hit.value;

    const value = load();
    store.set(k, { value, expires: now + ttlMs });
    if (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    // Don't keep failures around
    value.catch(() => store.delete(k));
    return value;
  };
}

/** Resolve to `fallback` if `promise` takes longer than `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}
