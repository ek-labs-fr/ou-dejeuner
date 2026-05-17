// Admin gate primitives — separate cookie from the office gate so the
// admin session is short-lived and revocable without forcing colleagues
// to re-enter the office password. Same HMAC secret as `lib/gate.ts`
// since the cookie names differentiate them.
//
// Env reads are deferred until first call so `next build` can compile
// this module on CI runners that do not carry the runtime secrets.

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      "Missing admin gate env vars. Set GATE_COOKIE_SECRET and ADMIN_PASSWORD in .env.",
    );
  }
  return v;
}

export type AdminPayload = { iat: number };

export const ADMIN_COOKIE_NAME = "od_admin";
// 24 hours — much shorter than the year-long office gate. If a laptop is
// stolen the blast radius caps at one day.
export const ADMIN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24;

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(requireEnv("GATE_COOKIE_SECRET")),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return keyPromise;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signAdminCookie(): Promise<string> {
  const payload: AdminPayload = { iat: Math.floor(Date.now() / 1000) };
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    await getKey(),
    new TextEncoder().encode(payloadB64),
  );
  return `${payloadB64}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifyAdminCookie(value: string): Promise<AdminPayload | null> {
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const payloadB64 = value.slice(0, dot);
  const sigB64 = value.slice(dot + 1);

  let ok = false;
  try {
    ok = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      base64UrlDecode(sigB64),
      new TextEncoder().encode(payloadB64),
    );
  } catch {
    return null;
  }
  if (!ok) return null;

  let payload: AdminPayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as AdminPayload;
  } catch {
    return null;
  }
  if (typeof payload.iat !== "number") return null;
  if (payload.iat + ADMIN_COOKIE_MAX_AGE_SEC < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export function isAdminPassword(password: string): boolean {
  return constantTimeEqual(password, requireEnv("ADMIN_PASSWORD"));
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}
