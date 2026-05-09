// Browser-side identity helpers. Browser ID lives in a cookie so the server
// can also read it during SSR (for "what have *I* reacted to" rendering).
// Display name stays in localStorage — it's only ever sent on writes, never
// needed for SSR personalization.
//
// Identity only matters for full-tier users. Read-only viewers never call
// these helpers (their UI hides every write affordance).

export const BROWSER_ID_COOKIE = "od_browser";
const DISPLAY_NAME_KEY = "od_display_name";
const BROWSER_ID_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 365 days

export const DISPLAY_NAME_MAX_LEN = 40;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return m ? decodeURIComponent(m[1]!) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSec}; path=/; samesite=lax`;
}

export function getOrCreateBrowserId(): string {
  let id = readCookie(BROWSER_ID_COOKIE);
  if (!id) {
    id = crypto.randomUUID();
    writeCookie(BROWSER_ID_COOKIE, id, BROWSER_ID_MAX_AGE_SEC);
  }
  return id;
}

export function getBrowserId(): string | null {
  return readCookie(BROWSER_ID_COOKIE);
}

export function getDisplayName(): string | null {
  return safeStorage()?.getItem(DISPLAY_NAME_KEY) ?? null;
}

export function setDisplayName(name: string): void {
  const trimmed = name.trim().slice(0, DISPLAY_NAME_MAX_LEN);
  if (!trimmed) return;
  safeStorage()?.setItem(DISPLAY_NAME_KEY, trimmed);
}

export function clearDisplayName(): void {
  safeStorage()?.removeItem(DISPLAY_NAME_KEY);
}
