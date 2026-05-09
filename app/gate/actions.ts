"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  GATE_COOKIE_MAX_AGE_SEC,
  GATE_COOKIE_NAME,
  signGateCookie,
  tierForPassword,
} from "@/lib/gate";

// Open-redirect guard: only honour relative paths starting with `/` and not
// `//` (which would be a protocol-relative URL).
function safeNext(raw: string): string {
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function unlockGate(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  const tier = tierForPassword(password);
  if (!tier) {
    redirect(`/gate?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const value = await signGateCookie(tier);
  const c = await cookies();
  c.set(GATE_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE_SEC,
  });

  redirect(next);
}
