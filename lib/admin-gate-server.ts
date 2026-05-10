// Server-component-only helpers for the admin gate. Kept in a separate
// module from `lib/admin-gate.ts` so the cookie primitives stay importable
// from middleware (Edge runtime), which can't pull in `next/headers`.

import { cookies } from "next/headers";

import {
  ADMIN_COOKIE_NAME,
  type AdminPayload,
  verifyAdminCookie,
} from "./admin-gate";

export async function getAdminPayload(): Promise<AdminPayload | null> {
  const c = await cookies();
  const value = c.get(ADMIN_COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyAdminCookie(value);
}
