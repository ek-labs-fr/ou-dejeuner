// Gate primitives — pure crypto + password matching, no Next.js imports.
// Safe to import from middleware (Edge runtime), server components, and
// client-side hashing helpers alike. Uses Web Crypto so it runs unchanged
// in both Node and Edge.
//
// Env reads are deferred until first call so `next build` can compile
// this module on CI runners that do not carry the runtime secrets.

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      "Missing gate env vars. Set GATE_COOKIE_SECRET, OFFICE_GATE_PASSWORD, and OFFICE_GATE_PASSWORD_READONLY in .env.",
    );
  }
  return v;
}

export type Tier = "full" | "readonly";
export type GatePayload = { tier: Tier; iat: number };

export const GATE_COOKIE_NAME = "od_gate";
// 365 days. Spec says the gate is "remembered for that browser" — long-lived
// cookie matches that intent. The cookie's own Max-Age plus the iat check
// inside verifyGateCookie are belt-and-braces.
export const GATE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

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
  // Allocate an ArrayBuffer (not ArrayBufferLike) so the resulting view is
  // accepted by Web Crypto's BufferSource without casts.
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signGateCookie(tier: Tier): Promise<string> {
  const payload: GatePayload = { tier, iat: Math.floor(Date.now() / 1000) };
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

export async function verifyGateCookie(value: string): Promise<GatePayload | null> {
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

  let payload: GatePayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as GatePayload;
  } catch {
    return null;
  }

  if (payload.tier !== "full" && payload.tier !== "readonly") return null;
  if (typeof payload.iat !== "number") return null;
  if (payload.iat + GATE_COOKIE_MAX_AGE_SEC < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export function tierForPassword(password: string): Tier | null {
  // Check both passwords with constant-time compare so an attacker can't
  // distinguish "wrong full password" from "wrong readonly password" by
  // timing. The server reveals only "yes/no" to the client either way.
  const fullMatch = constantTimeEqual(password, requireEnv("OFFICE_GATE_PASSWORD"));
  const roMatch = constantTimeEqual(password, requireEnv("OFFICE_GATE_PASSWORD_READONLY"));
  if (fullMatch) return "full";
  if (roMatch) return "readonly";
  return null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}
