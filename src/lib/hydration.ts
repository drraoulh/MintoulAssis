/**
 * True once the app has hydrated in this tab. Client-side navigations after that can
 * read localStorage during the first render without causing a hydration mismatch.
 */

let hydrated = false;

export function markHydrated(): void {
  hydrated = true;
}

export function isHydrated(): boolean {
  return hydrated;
}
