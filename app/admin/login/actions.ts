"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_COOKIE_MAX_AGE_SEC,
  ADMIN_COOKIE_NAME,
  isAdminPassword,
  signAdminCookie,
} from "@/lib/admin-gate";

// Only honour /admin-prefixed relative paths — open-redirect guard.
function safeNext(raw: string): string {
  if (!raw.startsWith("/admin")) return "/admin";
  if (raw.startsWith("//")) return "/admin";
  return raw;
}

export async function unlockAdmin(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/admin"));

  if (!isAdminPassword(password)) {
    redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const value = await signAdminCookie();
  const c = await cookies();
  c.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SEC,
  });

  redirect(next);
}

export async function logoutAdmin(): Promise<void> {
  const c = await cookies();
  c.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
